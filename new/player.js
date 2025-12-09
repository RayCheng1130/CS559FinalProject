/*jshint esversion: 6 */
// @ts-check
import * as T from "../libs/CS559-Three/build/three.module.js";
import { GLTFLoader } from "../libs/CS559-Three/examples/jsm/loaders/GLTFLoader.js";

export class Player {
    constructor(scene, onLoadComplete) {
        this.scene = scene;
        this.mixer = null;
        this.model = null;
        this.actions = {};
        this.currentAction = null;

        this.loader = new GLTFLoader();
        this.loadModel(onLoadComplete);
    }

    loadModel(onLoadComplete) {
        this.loader.load("../animations/all.glb", (gltf) => {
            this.model = gltf.scene;
            this.model.scale.set(6, 6, 6);
            this.model.traverse(o => {
                if (o.isMesh) o.castShadow = true;
            });

            this.scene.add(this.model);

            // Mixer
            this.mixer = new T.AnimationMixer(this.model);

            const clips = gltf.animations;

            function getClip(name) {
                const c = clips.find(x => x.name === name);
                if (!c) console.error("Missing animation:", name);
                return c;
            }

            // 1~48 Idle
            // 49~132 Off_Idle
            // 132~168 Kick
            // 200~282 Left_Block
            // 300~359 Right_Block
            const FPS = 24;

            const Idle       = T.AnimationUtils.subclip(getClip("Idle"),        "Idle",        1,   48,  FPS);
            const OffIdle    = T.AnimationUtils.subclip(getClip("Off_Idle"),    "OffIdle",     49,  132, FPS);
            const Kick       = T.AnimationUtils.subclip(getClip("Kick"),        "Kick",        132, 168, FPS);
            const LeftBlock  = T.AnimationUtils.subclip(getClip("Left_Block"),  "LeftBlock",   200, 282, FPS);
            const RightBlock = T.AnimationUtils.subclip(getClip("Right_Block"), "RightBlock",  300, 359, FPS);
            const Dance      = T.AnimationUtils.subclip(getClip("Dance"),      "Dance",      400, 875, FPS);
            const Run        = T.AnimationUtils.subclip(getClip("Run"),        "Run",        880, 892, FPS);

            // Register actions
            this.actions["Idle"]       = this.mixer.clipAction(Idle);
            this.actions["Off_Idle"]    = this.mixer.clipAction(OffIdle);
            this.actions["Kick"]       = this.mixer.clipAction(Kick);
            this.actions["Left_Block"]  = this.mixer.clipAction(LeftBlock);
            this.actions["Right_Block"] = this.mixer.clipAction(RightBlock);
            this.actions["Dance"]      = this.mixer.clipAction(Dance);
            this.actions["Run"]        = this.mixer.clipAction(Run);
            this.actions["Off_Idle"].timeScale = 0.6;
            this.actions["Kick"].timeScale = 0.6;
            this.actions["Left_Block"].timeScale = 0.4;
            this.actions["Right_Block"].timeScale = 0.4;
            this.actions["Dance"].timeScale = 0.6;
            this.actions["Run"].timeScale = 0.6;

            this.actions["Kick"].setLoop(T.LoopOnce, 0);
            this.actions["Kick"].clampWhenFinished = true;
            this.actions["Left_Block"].setLoop(T.LoopOnce, 0);
            this.actions["Left_Block"].clampWhenFinished = true;
            this.actions["Right_Block"].setLoop(T.LoopOnce, 0);
            this.actions["Right_Block"].clampWhenFinished = true;
            this.actions["Run"].setLoop(T.LoopRepeat, Infinity);
            

            // Play default
            this.play("Idle");

            if (onLoadComplete) onLoadComplete();
        });
    }

    play(name) {
        if (!this.actions[name] || this.currentAction === name) return;

        const prev = this.currentAction ? this.actions[this.currentAction] : null;
        const next = this.actions[name];

        if (prev) prev.fadeOut(0.2);
        next.reset().fadeIn(0.2).play();

        this.currentAction = name;
    }

    update(delta) {
        if (this.mixer) this.mixer.update(delta);
    }
}
