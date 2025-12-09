/*jshint esversion: 6 */
// @ts-check
/* global tf */
import { Human } from "./human.js";

const ACTIONS = [-1, 0, 1]; // Left, Stay, Right

export class goalKeeper extends Human {
    constructor(params = {}) {
        super({
            x: params.x || -48,
            y: params.y || 1,
            z: params.z || 0,
            scale: params.scale || 1.5,
            moveSpeed: params.moveSpeed || 20, // Faster for training
            turnSpeed: 0,
            label: "Goal Keeper"
        });

        this._keys = { forward: false, backward: false, left: false, right: false };
        this._ballRef = null;
        this._baseX = this._root.position.x;

        // --- DQN SETUP ---
        this._model = tf.sequential();
        this._model.add(tf.layers.dense({ inputShape: [3], units: 64, activation: "relu" }));
        this._model.add(tf.layers.dense({ units: 64, activation: "relu" }));
        this._model.add(tf.layers.dense({ units: ACTIONS.length, activation: 'linear' }));
        
        this._model.compile({ optimizer: tf.train.adam(0.001), loss: "meanSquaredError" });

        this._mode = params.mode || "train";
        
        // Hyperparameters
        this._gamma = 0.95;          
        this._epsilon = (this._mode === "train" ? 1.0 : 0.01); 
        this._epsilonMin = 0.05;
        this._epsilonDecay = 0.998;  // smaller-> train faster

        // Experience Replay Buffer
        this._replayBuffer = [];
        this._maxBufferSize = 2000;
        this._batchSize = 32;

        this._lastState = null;
        this._lastActionIdx = null;
    }

    /**
     * Save the trained model to Downloads
     */
    async saveBrain() {
        await this._model.save('downloads://gk-brain'); // specify the name of the saved model 
        console.log("Brain saved to downloads!");
    }

    /**
     * Load a model from uploaded files
     */
    async loadBrain(files) {
        this._model = await tf.loadLayersModel(tf.io.browserFiles(files));
        this._model.compile({ optimizer: tf.train.adam(0.001), loss: "meanSquaredError" });
        this._epsilon = 0.0; // Turn off exploration
        this._mode = "play";
        console.log("Brain loaded! Mode set to PLAY.");
    }

    setBall(ball, stadiumScale, stadiumX, stadiumZ) {
        this._ballRef = { ball, stadiumScale, stadiumX, stadiumZ };
    }

    _normalizeState(ballWX, ballWZ, keeperZ) {
        return [
            ballWX / 60.0,   // ball X
            ballWZ / 40.0,   // ball Z
            keeperZ / 30.0   // keeper Z
        ];
    }

    _selectAction(state) {
        return tf.tidy(() => {
            // Epsilon-Greedy
            if (this._mode === "train" && Math.random() < this._epsilon) {
                return Math.floor(Math.random() * ACTIONS.length);
            }
            const input = tf.tensor2d([state]);
            const output = this._model.predict(input);
            // @ts-ignore
            return output.argMax(1).dataSync()[0];
        });
    }

    // Train on a batch of random memories (Experience Replay)
    async _replay() {
        if (this._replayBuffer.length < this._batchSize) return;

        // Sample random batch
        const batch = [];
        for(let i=0; i<this._batchSize; i++) {
            const idx = Math.floor(Math.random() * this._replayBuffer.length);
            batch.push(this._replayBuffer[idx]);
        }

        const states = batch.map(e => e.state);
        const nextStates = batch.map(e => e.nextState);

        const tfStates = tf.tensor2d(states);
        const tfNextStates = tf.tensor2d(nextStates);

        const qCurrent = this._model.predict(tfStates);
        const qNext = this._model.predict(tfNextStates);

        const qCurrentData = await qCurrent.data();
        const qNextData = await qNext.data();

        // Update Q values
        const x = [];
        const y = [];

        for (let i = 0; i < this._batchSize; i++) {
            const reward = batch[i].reward;
            const actionIdx = batch[i].action;
            const done = batch[i].done;
            
            // Current Q-values for this state
            const currentQ = qCurrentData.slice(i * 3, (i + 1) * 3); // 3 actions
            
            let target = reward;
            if (!done) {
                // Max Q for next state
                const nextQ = qNextData.slice(i * 3, (i + 1) * 3);
                const maxNext = Math.max(...nextQ);
                target = reward + this._gamma * maxNext;
            }

            // Update only the action we took
            currentQ[actionIdx] = target;

            x.push(batch[i].state);
            y.push(currentQ);
        }

        const xTensor = tf.tensor2d(x);
        const yTensor = tf.tensor2d(y, [this._batchSize, 3]);

        await this._model.fit(xTensor, yTensor, { epochs: 1, verbose: 0 });

        // Cleanup memory
        tfStates.dispose(); tfNextStates.dispose();
        qCurrent.dispose(); qNext.dispose();
        xTensor.dispose(); yTensor.dispose();

        // Decay Epsilon
        if (this._epsilon > this._epsilonMin) {
            this._epsilon *= this._epsilonDecay;
        }
    }

    stepWorld(delta) {
        if (!this._ballRef) return;
        const dt = Math.min(delta, 0.05);

        // 1. Observe State
        const { ball, stadiumScale: s, stadiumX: ox, stadiumZ: oz } = this._ballRef;
        const ballWX = ox + ball.position.x * s;
        const ballWZ = oz + ball.position.z * s;
        const keeperZ = this._root.position.z;

        const currentState = this._normalizeState(ballWX, ballWZ, keeperZ);

        // --- NEW: per-step shaping reward + non-terminal transitions ---
        if (this._mode === "train" && this._lastState !== null && this._lastActionIdx !== null) {
            // Small shaping reward: punish being outside the goal mouth
            const goalHalfWidth = 10.5;
            let stepReward = 0;
            if (Math.abs(keeperZ) > goalHalfWidth) {
                stepReward = -0.05;   // tune: -0.01, -0.05, -0.1
            }

            // Non-terminal transition: lastState --(lastAction, stepReward)--> currentState
            this.recordExperience(
                this._lastState,
                this._lastActionIdx,
                stepReward,
                currentState,
                /*done=*/false
            );
        }
        // --- END NEW ---

        // 2. Act
        this._root.position.x = this._baseX; // Lock X
        const actionIdx = this._selectAction(currentState);
        const moveDir = ACTIONS[actionIdx];
        
        let newZ = this._root.position.z + (this._moveSpeed * dt * moveDir);
        // Hard clamp logic
        if (newZ > 30) newZ = 30; 
        if (newZ < -30) newZ = -30;
        this._root.position.z = newZ;

        // Store current state/action for next step
        this._lastState = currentState;
        this._lastActionIdx = actionIdx;

        // 3. Expose state for the Scene to read (for terminal reward)
        this.currentObservation = {
            state: currentState,
            action: actionIdx
        };
        
        // Animation
        this._root.rotation.y = 0;
        if(this.joints) {
            const swing = moveDir * 0.5;
            this.joints.leftArm.shoulder.rotation.x = swing;
            this.joints.rightArm.shoulder.rotation.x = -swing;
        }
    }


    // Called by the Training Scene when a round ends (Save or Goal)
    recordExperience(prevState, action, reward, nextState, done) {
        if (this._mode !== "train") return;

        this._replayBuffer.push({ state: prevState, action, reward, nextState, done });
        
        if (this._replayBuffer.length > this._maxBufferSize) {
            this._replayBuffer.shift(); // Remove oldest
        }

        // Train periodically
        this._replay();
    }
}