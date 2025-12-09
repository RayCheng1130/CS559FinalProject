/*jshint esversion: 6 */
// @ts-check

import * as T from "../libs/CS559-Three/build/three.module.js";
import { GrObject } from "../libs/CS559-Framework/GrObject.js";
import { goalKeeper } from "./goalKeeper.js";

/**
 * TRAINING CAMP
 * A lightweight scene to train the GK.
 */
class TrainingGym extends GrObject {
    constructor(gk) {
        const group = new T.Group();
        super("TrainingGym", group);
        this.gk = gk;

        // 1. The Floor (Green)
        const floor = new T.Mesh(
            new T.PlaneGeometry(100, 100),
            new T.MeshStandardMaterial({ color: 0x228822 })
        );
        floor.rotation.x = -Math.PI / 2;
        group.add(floor);

        // 2. The Goal (Wireframe Box for visuals)
        const goalGeo = new T.BoxGeometry(4, 3, 21); // ~10.5m wide either side
        const goalMat = new T.MeshBasicMaterial({ color: "white", wireframe: true });
        const goal = new T.Mesh(goalGeo, goalMat);
        goal.position.set(-49, 1.5, 0); // Position at X = -49
        group.add(goal);

        // 3. The Ball
        this.ballRadius = 1.0;
        this.ball = new T.Mesh(
            new T.SphereGeometry(this.ballRadius),
            new T.MeshStandardMaterial({ color: "white" })
        );
        group.add(this.ball);

        // Physics State
        this.ballVel = new T.Vector3();
        this.resetBall();

        // Stats
        this.saves = 0;
        this.goals = 0;
        this.updateUI();
    }

    resetBall() {
        // Start ball at X=30 (right side), Random Z
        const startZ = (Math.random() * 40) - 20;
        this.ball.position.set(30, this.ballRadius, startZ);

        // Aim at Goal (X = -50)
        // We aim at a random spot in the goal mouth (Z = -10 to 10)
        const targetZ = (Math.random() * 20) - 10;
        
        const target = new T.Vector3(-50, this.ballRadius, targetZ);
        
        // Calculate Velocity Vector
        const dir = new T.Vector3().subVectors(target, this.ball.position).normalize();
        const speed = 35 + Math.random() * 10; // Fast shots
        this.ballVel = dir.multiplyScalar(speed);
        
        this.roundActive = true;
    }

    stepWorld(delta) {
        const dt = Math.min(delta, 0.05);
        if (!this.roundActive) return;

        // 1. Move Ball
        this.ball.position.addScaledVector(this.ballVel, dt);

        // 2. Collision Check (Ball vs GK)
        // GK is at ~ -48. Ball Radius 1.0. GK Radius ~2.0
        const distSq = this.gk._root.position.distanceToSquared(this.ball.position);
        
        let reward = 0;
        let done = false;
        
        // GK Observation from THIS frame (before reset)
        const currentObs = this.gk.currentObservation; 

        // CASE A: GK SAVED IT
        if (distSq < 9.0) { // 3.0 distance threshold
            reward = 10; // Big reward
            done = true;
            this.saves++;
            console.log("SAVE!");
        } 
        // CASE B: GOAL SCORED (Ball passed GK)
        else if (this.ball.position.x < -50) {
            // Check if it was actually in the goal width (Z between -10 and 10)
            if (Math.abs(this.ball.position.z) < 10.5) {
                reward = -10; // Penalty
                this.goals++;
                console.log("GOAL :(");
            } else {
                reward = 1; // Slight reward for letting a wide ball go (optional)
            }
            done = true;
        }

        if (done && currentObs) {
            const nextState = [0, 0, 0]; // or better: use normalized state at reset if you want

            const goalHalfWidth = 10.5;
            const gkZ = this.gk._root.position.z;
            if (Math.abs(gkZ) > goalHalfWidth) { // extra penalty
                reward -= 2;   // penalty for leaving the goal area
            }

            this.gk.recordExperience(
                currentObs.state,
                currentObs.action,
                reward,
                nextState,
                done
            );

            this.resetBall();
            this.updateUI();
        }
    }

    updateUI() {
        // Simple HTML overlay to show stats
        let div = document.getElementById("train-stats");
        if (!div) {
            div = document.createElement("div");
            div.id = "train-stats";
            div.style.position = "absolute";
            div.style.top = "10px";
            div.style.left = "10px";
            div.style.color = "white";
            div.style.fontFamily = "monospace";
            div.style.fontSize = "20px";
            div.style.backgroundColor = "rgba(0,0,0,0.5)";
            div.style.padding = "10px";
            document.body.appendChild(div);
        }
        // @ts-ignore
        div.innerHTML = `SAVES: ${this.saves} <br> GOALS: ${this.goals} <br> Eps: ${this.gk._epsilon.toFixed(3)}`;
    }
}

export function main(world) {
    // 1. Create GK
    const gk = new goalKeeper({
        x: -48, y: 0, z: 0,
        mode: "train"
    });
    world.add(gk);

    // 2. Create Gym
    const gym = new TrainingGym(gk);
    world.add(gym);

    // 3. Link them
    // Gym acts as the stadium for the GK's local calculations
    gk.setBall(gym.ball, 1, 0, 0);

    // 4. UI Buttons
    createControls(gk);
}

function createControls(gk) {
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.top = "100px";
    div.style.left = "10px";
    
    const btnSave = document.createElement("button");
    btnSave.innerText = "DOWNLOAD BRAIN";
    btnSave.onclick = () => gk.saveBrain();
    
    const inputLoad = document.createElement("input");
    inputLoad.type = "file";
    inputLoad.multiple = true;
    inputLoad.onchange = (e) => {
        // @ts-ignore
        gk.loadBrain(e.target.files);
    };

    div.appendChild(btnSave);
    div.appendChild(document.createElement("br"));
    div.appendChild(inputLoad);
    document.body.appendChild(div);
}