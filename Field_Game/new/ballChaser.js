/*jshint esversion: 6 */
// @ts-check

import { Human } from "./human.js";

export class BallChaser extends Human {
    constructor(params = {}) {
        super({
            x: params.x || 10,          // spawn somewhere in the field
            y: params.y || 1,
            z: params.z || 0,
            scale: params.scale || 1.5,
            moveSpeed: params.moveSpeed || 8,   // slower than your main player (10) and GK (12)
            turnSpeed: 0,                       // we will set direction manually
            label: params.label || "Chaser"
        });

        // Reference to ball & stadium transform (same pattern as GK)
        this._ballRef = null;

        // Use these from Human, but we control them here
        this._dirAngle = 0;
    }

    /**
     * Tell the chaser where the ball is, in the same coordinate system you used for GK
     * (ball inside stadium group + scale + offsets).
     */
    setBall(ball, stadiumScale, stadiumX, stadiumZ) {
        this._ballRef = {
            ball,
            stadiumScale,
            stadiumX,
            stadiumZ
        };
    }

    stepWorld(delta, timeOfDay) {
        const dt = Math.min(delta || 0.016, 0.05);
        if (!this._ballRef || !this._root) return;

        const { ball, stadiumScale: s, stadiumX: ox, stadiumZ: oz } = this._ballRef;

        // Ball world position (same idea as in goalKeeper.js)
        const ballWX = ox + ball.position.x * s;
        const ballWZ = oz + ball.position.z * s;

        const px = this._root.position.x;
        const pz = this._root.position.z;

        // Direction from player to ball in XZ plane
        let dx = ballWX - px;
        let dz = ballWZ - pz;
        const dist = Math.sqrt(dx * dx + dz * dz);

        let moving = false;

        if (dist > 0.2) { // small dead zone so he doesn't jitter when very close
            dx /= dist;
            dz /= dist;

            const step = this._moveSpeed * dt;

            let newX = px + dx * step;
            let newZ = pz + dz * step;

            // Clamp to the same field bounds Human uses
            const maxX = this._boundX;
            const maxZ = this._boundZ;

            if (newX > maxX) newX = maxX;
            if (newX < -maxX) newX = -maxX;
            if (newZ > maxZ) newZ = maxZ;
            if (newZ < -maxZ) newZ = -maxZ;

            this._root.position.x = newX;
            this._root.position.z = newZ;

            moving = true;

            // Face the direction of motion
            this._dirAngle = Math.atan2(dx, dz);  // note: sin→x, cos→z, like Human
            this._root.rotation.y = this._dirAngle;
        }

        // --------- LIMB ANIMATION (copied from Human, but using our 'moving' flag) ---------
        const now = performance.now() * 0.005;
        let swing = 0;

        if (moving) {
            swing = Math.sin(now * 2.5) * 0.7;  // bigger swing while walking
        } else {
            // tiny idle motion
            swing = Math.sin(now) * 0.1;
        }

        if (this.joints) {
            // Arms swing forward/back
            this.joints.leftArm.shoulder.rotation.x = +swing;
            this.joints.rightArm.shoulder.rotation.x = -swing;

            // Legs swing forward/back
            this.joints.leftLeg.hip.rotation.x = -swing * 0.9;
            this.joints.rightLeg.hip.rotation.x = +swing * 0.9;
        }
    }
}
