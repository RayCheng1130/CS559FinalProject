// Human.js
import * as T from "../libs/CS559-Three/build/three.module.js";
import { GrObject } from "../libs/CS559-Framework/GrObject.js";

export class Human extends GrObject {
    constructor(params = {}) {
        const human = new T.Group();
        const label = params.label || "Human";
        super(label, human);

        this._root = human;

        const skin = new T.MeshStandardMaterial({
            color: 0xffc9a6,
            roughness: 0.8
        });

        const clothes = new T.MeshStandardMaterial({
            color: 0x3344ff,
            roughness: 0.7
        });

        // --- BODY ROOT ---
        // torso
        const torso = new T.Mesh(
            new T.BoxGeometry(1, 2, 0.6),
            clothes
        );
        torso.position.y = 3;
        human.add(torso);

        // head
        const head = new T.Mesh(
            new T.SphereGeometry(0.6, 32, 16),
            skin
        );
        head.position.y = 4.6;
        human.add(head);

        // ========== ARMS ==========
        function makeArm(side = 1) {
            const shoulder = new T.Group();
            shoulder.position.set(side * 0.75, 3.8, 0);

            const upper = new T.Mesh(
                new T.BoxGeometry(0.4, 1.2, 0.4),
                clothes
            );
            upper.position.y = -0.6;
            shoulder.add(upper);

            const elbow = new T.Group();
            elbow.position.y = -1.2;
            upper.add(elbow);

            const lower = new T.Mesh(
                new T.BoxGeometry(0.35, 1.1, 0.35),
                clothes
            );
            lower.position.y = -0.55;
            elbow.add(lower);

            return { shoulder, elbow };
        }

        const leftArm = makeArm(+1);
        const rightArm = makeArm(-1);

        human.add(leftArm.shoulder);
        human.add(rightArm.shoulder);

        // ========== LEGS ==========
        function makeLeg(side = 1) {
            const hip = new T.Group();
            hip.position.set(side * 0.4, 2, 0);

            const upper = new T.Mesh(
                new T.BoxGeometry(0.5, 1.4, 0.5),
                clothes
            );
            upper.position.y = -0.7;
            hip.add(upper);

            const knee = new T.Group();
            knee.position.y = -1.4;
            upper.add(knee);

            const lower = new T.Mesh(
                new T.BoxGeometry(0.45, 1.2, 0.45),
                clothes
            );
            lower.position.y = -0.6;
            knee.add(lower);

            return { hip, knee };
        }

        const leftLeg = makeLeg(+1);
        const rightLeg = makeLeg(-1);

        human.add(leftLeg.hip);
        human.add(rightLeg.hip);

        // --- CAMERA RIG NEAR THE HEAD ---
        // This is a small group the framework's camera will "ride" on.
        const camRig = new T.Group();

        // place it roughly at head height, slightly behind the head
        camRig.position.set(0, 4.5, -1.5);

        // attach to the main human root so it inherits rotation & position
        this._root.add(camRig);

        // expose to the Graphics Town UI as a rideable anchor
        this._cameraRig = camRig;
        this.rideable = camRig;

        

        // store joints for animation
        this.joints = {
            leftArm,
            rightArm,
            leftLeg,
            rightLeg
        };

        // --------- POSITION & SCALE ---------
        human.position.set(params.x || 0, params.y || 0, params.z || 0);
        human.scale.set(params.scale || 1, params.scale || 1, params.scale || 1);

        // --------- MOVEMENT STATE ---------
        this._keys = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };

        this._moveSpeed = params.moveSpeed || 10;   // units / second
        this._turnSpeed = params.turnSpeed || 1.0;  // radians / second
        this._dirAngle = 0;                         // facing direction around Y
        this._boundX = params.boundX !== undefined ? params.boundX : 95;
        this._boundZ = params.boundZ !== undefined ? params.boundZ : 55;

        // bind keyboard events
        window.addEventListener("keydown", (e) => this._onKey(e, true));
        window.addEventListener("keyup", (e) => this._onKey(e, false));
    }

    _onKey(e, isDown) {
        const k = e.key;
        switch (k) {
            case "w":
            case "W":
            case "ArrowUp":
                this._keys.forward = isDown;
                break;
            case "s":
            case "S":
            case "ArrowDown":
                this._keys.backward = isDown;
                break;
            case "a":
            case "A":
            case "ArrowLeft":
                this._keys.left = isDown;
                break;
            case "d":
            case "D":
            case "ArrowRight":
                this._keys.right = isDown;
                break;
            default:
                return;
        }

        // optional: prevent arrow keys from scrolling page
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k)) {
            e.preventDefault();
        }
    }

    stepWorld(delta, timeOfDay) {
        const dt = Math.min(delta || 0.016, 0.05);

        // --------- UPDATE ORIENTATION ---------
        if (this._keys.left) {
            this._dirAngle += this._turnSpeed * dt;
        }
        if (this._keys.right) {
            this._dirAngle -= this._turnSpeed * dt;
        }

        if (this._root) {
            this._root.rotation.y = this._dirAngle;
        }

        // --------- UPDATE POSITION ---------
        let moveDir = 0;
        if (this._keys.forward) moveDir += 1;
        if (this._keys.backward) moveDir -= 1;

        const moving = moveDir !== 0;

        if (moving && this._root) {
            const dist = this._moveSpeed * dt * moveDir;
            const dx = Math.sin(this._dirAngle) * dist;
            const dz = Math.cos(this._dirAngle) * dist;

            // tentative new position
            let newX = this._root.position.x + dx;
            let newZ = this._root.position.z + dz;

            // clamp to field bounds (same as ball area)
            const maxX = this._boundX;
            const maxZ = this._boundZ;

            if (newX > maxX) newX = maxX;
            if (newX < -maxX) newX = -maxX;
            if (newZ > maxZ) newZ = maxZ;
            if (newZ < -maxZ) newZ = -maxZ;

            this._root.position.x = newX;
            this._root.position.z = newZ;
        }

        // --------- LIMB ANIMATION ---------
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
