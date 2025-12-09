/*jshint esversion: 6 */
// @ts-check

import * as T from "../libs/CS559-Three/build/three.module.js";

import { OldTrafford } from "./Old_Trafford_copy.js";
import { Human } from "./human.js";
import { goalKeeper } from "./goalKeeper.js";
import { Player } from "./player.js";
import { GLTFLoader } from "../libs/CS559-Three/examples/jsm/loaders/GLTFLoader.js";

/********************************************************************** */
/** PURE THREE.JS VERSION — NO GrWorld, NO OrbitControls               */
/********************************************************************** */

// HUD DOM elements
const scoreHUD = document.getElementById("score-hud");
const teamNameDisplay = document.getElementById("team-name-display");
const opponentNameDisplay = document.getElementById("opponent-name-display");
const winBanner = document.getElementById("you-win-banner");
const teamScoreRow = document.querySelector("#team-score-row .score-icons");
const opponentScoreRow = document.querySelector("#opponent-score-row .score-icons");

// ----------------------------- SCORE BAR -------------------------
// Score state
let score = {
    team: [],
    opponent: []
};
let currentShot = 0;

// Initialize 5 shots (empty placeholders ⚪️)
function initShots() {
    for (let i = 0; i < 5; i++) {
        const t = document.createElement("span");
        t.textContent = "⚪️";
        teamScoreRow.appendChild(t);
        score.team.push(t);

        const o = document.createElement("span");
        o.textContent = "⚪️";
        opponentScoreRow.appendChild(o);
        score.opponent.push(o);
    }
}

// Update a shot
// team: 'team' | 'opponent', index: 0-4, made: true (⚽️) / false (✖️)
let playerIndex = 0;
let opponentIndex = 0;
function updateShot(team, index, made) {
    const shot = team === "team" ? score.team[playerIndex] : score.opponent[opponentIndex];
    if (team === "team") playerIndex++;
    else opponentIndex++;
    shot.textContent = made ? "⚽️" : "❌";
}
function winDirectly() {
    whoWins = "opponent";
    for (let i = 0; i < 5; i++)
        updateShot("team", i, false);
    for (let i = 0; i < 5; i++)
        updateShot("opponent", i, true);
    camera.position.copy(gkCam);
    camera.lookAt(new T.Vector3(-50, 5, 0));
    const pos = new T.Vector3(-101, 0.5, 0);
    playerObj.model.position.copy(pos);
    playerObj.model.rotation.y = Math.PI / 2;
}

const scene = new T.Scene();
const startUI = document.getElementById("fifa-ui");
const startBtn = document.getElementById("start-button");
const skipBtn = document.getElementById("skip-button");
const teamNameInput = document.getElementById("team-name");
let game_mode = "loading";
let all_assets_loaded = false;
let start_button_clicked = false;
let loaded_assets_count = 0;
function markLoaded() {
    loaded_assets_count++;
    if (loaded_assets_count === 1) {
        console.log("ALL GLB FILES LOADED");
        all_assets_loaded = true;
        game_mode = "waiting_start";
        onAssetsLoaded();
    }
}
let mixer;
let actions = {};
let activeAction;
let previousAction;
let opponent;
let opponentMixer;
let countdownTime = 0;
let countdownActive = false;
let countdownDisplay = document.getElementById("countdown");
let goalOverlay = document.getElementById("goal-overlay");
let missOverlay = document.getElementById("miss-overlay");
let whosTurn = "player"; // 'player' | 'opponent'
let whoWins = null;
let gkGuess = null;
let playerCam;
let gkCam = new T.Vector3( -120, 10, 0 );
function _showOverlay(el, duration = 3000) {
    if (!el) return;
    el.style.display = "flex";
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
        el.style.display = "none";
    }, duration);
}
// Taking turns
function resetBallToPenalty() {
    if (!stadium || !stadium._ball) return;
    stadium._ball.userData = stadium._ball.userData || {};
    stadium._ball.userData.active = false;
    delete stadium._ball.userData.velocity;
    stadium._ball.userData._isPenaltyShot = false;
    stadium._ball.userData._goalChecked = false;
    stadium._ball.userData._owner = null;
    stadium._ball.userData._shotDirection = null;
    const worldPos = penaltyPoint.clone();
    worldPos.y += (stadium._ballRadius || 0.5) + (stadium._ballElevation || 0.5) + 0.2;
    const localPos = stadium._ball.parent.worldToLocal(worldPos.clone());
    stadium._ball.position.copy(localPos);
    stadium._ballVel = stadium._ballVel || new T.Vector3(0,0,0);
    stadium._ballVel.set(0,0,0);

    isShooting = false;
    arrowControlEnabled = (whosTurn === "player");
    gkGuess = null;
}
function scheduleTurnSwitch(delay = 2000) {
    setTimeout(() => {
        resetBallToPenalty();
        whosTurn = (whosTurn === "player") ? "opponent" : "player";
        console.log("Turn switched to", whosTurn);

        gkGuess = null;
        isShooting = false;
        isCharging = false;
        if (pendingShot && pendingShot.timeoutId) {
            clearTimeout(pendingShot.timeoutId);
            pendingShot = null;
        }

        arrowControlEnabled = (whosTurn === "player");

        if (whosTurn === "player") {
            gk.group.position.set(-100, 1, 0);
            opponent.group.visible = false;
            opponent.group.position.set(0, -1000, 0);
            camera.position.copy(playerCam);
            camera.lookAt(new T.Vector3(-100, 5, 0));
            if (playerObj && playerObj.model) {
                const pos = penaltyPoint.clone();
                pos.x += 15; pos.y += 0.5; pos.z += 6;
                playerObj.model.position.copy(pos);
                playerObj.model.rotation.y = Math.PI * 1.5;
                try { playerObj.play("Off_Idle"); } catch (e) {}
            }
            drawPenaltyPoint();
            stadium._goalKeeper = stadium._goalKeeperBackup;
            stadium._goalKeeperBackup = null;
            gk.group.visible = true;
        } else {
            camera.position.copy(gkCam);
            camera.lookAt(new T.Vector3(-50, 5, 0));
            opponent.group.visible = true;
            opponent.group.position.set(-66, 0.5, 0);
            opponent.group.rotation.y = Math.PI / 2;
            if (playerObj && playerObj.model) {
                const pos = new T.Vector3(-101, 0.5, 0);
                playerObj.model.position.copy(pos);
                playerObj.model.rotation.y = Math.PI / 2;
                try { playerObj.play("Idle"); } catch (e) {}
            }
            if (arrow) {
                try { scene.remove(arrow); } catch (e) {}
                arrow = null;
            }
            stadium._goalKeeperBackup = stadium._goalKeeper;
            stadium._goalKeeper = null;
            gk.group.visible = false;
        }
    }, delay);
}
function showGoalOverlay(duration = 2500) { _showOverlay(goalOverlay, duration); scheduleTurnSwitch();}
function showMissOverlay(duration = 2500) { _showOverlay(missOverlay, duration); scheduleTurnSwitch();}


function preStartLogic() {
    //actions.idle.reset().play();
    // Start countdown
    countdownActive = true;
    countdownTime = 3;
    countdownDisplay.style.opacity = 1;
}

// event listeners
startBtn.addEventListener("click", () => {
    const teamName = teamNameInput.value.trim();
    if (teamName.length === 0) {
        alert("Please enter a team name!");
        return;
    }
    teamNameDisplay.textContent = teamName;
    start_button_clicked = true;
    game_mode = "intro";
    gk.loadBrainFromUrl("../model/simple.json");
    startUI.classList.add("hidden");
    scoreHUD.style.opacity = 1;
    initShots();
});
skipBtn.addEventListener("click", () => {
    const teamName = teamNameInput.value.trim();
    if (teamName.length === 0) {
        alert("Please enter a team name!");
        return;
    }
    teamNameDisplay.textContent = teamName;
    start_button_clicked = true;
    gk.loadBrainFromUrl("../model/hard.json");
    game_mode = "pre_start";
    startUI.classList.add("hidden");
    scoreHUD.style.opacity = 1;
    preStartLogic();
    initShots();
    //winDirectly();
});
window.addEventListener("keydown", (e) => {
    const stepDeg = 3;
    if (whosTurn === "player") {
        if (!arrowControlEnabled) return;
        if (!arrow) return;
        if (e.key === "ArrowLeft") {
            arrowAngleDeg += stepDeg;
            arrow.rotation.y = T.MathUtils.degToRad(arrowAngleDeg);
            e.preventDefault();
        } else if (e.key === "ArrowRight") {
            arrowAngleDeg -= stepDeg;
            arrow.rotation.y = T.MathUtils.degToRad(arrowAngleDeg);
            e.preventDefault();
        }
    }
    else if (whosTurn === "opponent") {
        // ArrowLeft -> guess left; ArrowDown -> center; ArrowRight -> right
        if (e.key === "ArrowLeft") {
            gkGuess = "left";
            setTimeout(() => { try { playerObj.play("Left_Block"); } catch (err) {} }, 200);
            e.preventDefault();
        } else if (e.key === "ArrowRight") {
            gkGuess = "right";
            setTimeout(() => { try { playerObj.play("Right_Block"); } catch (err) {} }, 180);
            e.preventDefault();
        } else if (e.key === "ArrowDown") {
            gkGuess = "center";
            setTimeout(() => { try { playerObj.play("Idle"); } catch (err) {} }, 180);
            e.preventDefault();
        }
        else return;
        if (gkGuess === null) return ;
        const options = ["left", "right", "center"];
       //const choice = options[Math.floor(Math.random() * options.length)];
       const choice = options[Math.floor(Math.random() * (options.length - 1))];
        if (stadium && stadium._ball) {
            drawPenaltyPoint();
            const targetZOffset = { left: -11.5, center: 0, right: 11.5 };
            const goalXWorld = -100;
            const shootFrom = penaltyPoint.clone();
            const target = new T.Vector3(goalXWorld, 1.5, (penaltyPoint.z || 0) + (targetZOffset[choice] || 0));
            const dir = new T.Vector3().subVectors(target, shootFrom).normalize();
            const power = 80;
            const velocity = dir.multiplyScalar(power);
            velocity.y = 1 + Math.random() * 2;

            stadium._ball.userData = stadium._ball.userData || {};
            stadium._ball.userData.velocity = velocity;
            stadium._ball.userData.active = true;
            stadium._ball.userData._isPenaltyShot = true;
            stadium._ball.userData._owner = "opponent";
            stadium._ball.userData._shotDirection = choice;
            stadium._ball.userData._shotStartTime = performance.now();

            console.log("Opponent shot launched:", choice, "gkGuess:", gkGuess);

            isShooting = true;
            arrowControlEnabled = false;
        }
        
    }
    if ((e.code === "Space" || e.key === " ") && !isShooting && !isCharging) {
        isCharging = true;
        chargeStartTime = performance.now();
        playerObj.play("Off_Idle");
        e.preventDefault();
    }
});

window.addEventListener("keyup", (e) => {
    if (!arrowControlEnabled) return;
    if (whosTurn === "opponent") return;
    if ((e.code === "Space" || e.key === " ") && isCharging && !isShooting && whosTurn === "player" && arrow) {
        const holdSeconds = Math.min((performance.now() - chargeStartTime) / 1000, maxChargeTime);
        const t = holdSeconds / maxChargeTime; // 0..1
        const shotSpeed = minShotSpeed + t * (maxShotSpeed - minShotSpeed);

        isCharging = false;
        isShooting = true;
        arrowControlEnabled = false;

        playerObj.play("Kick");
        if (playerObj.mixer) {
            const onFinished = function (evt) {
                try {
                    const clip = evt.action ? evt.action.getClip() : null;
                    if (clip && clip.name === "Kick") {
                        playerObj.play("Off_Idle");
                        playerObj.mixer.removeEventListener("finished", onFinished);
                    }
                } catch (err) {
                    console.warn("anim finished handler error", err);
                }
            };
            playerObj.mixer.addEventListener("finished", onFinished);
        }

        const q = new T.Quaternion();
        arrow.getWorldQuaternion(q);
        const dir = new T.Vector3(1, 0, 0).applyQuaternion(q).normalize();

        const velocity = dir.clone().multiplyScalar(shotSpeed);
        velocity.y = 4.0 + 10.0 * t;

        if (pendingShot && pendingShot.timeoutId) {
            clearTimeout(pendingShot.timeoutId);
            pendingShot = null;
        }

        const tid = setTimeout(() => {
            if (stadium._ball) {
                stadium._ball.userData = stadium._ball.userData || {};
                stadium._ball.userData.velocity = velocity.clone();
                stadium._ball.userData.active = true;
                stadium._ball.userData._isPenaltyShot = true;
                stadium._ball.userData._owner = "player";
                stadium._ball.userData._shotStartTime = performance.now();
                stadium._ball.userData._shotPowerT = t;
            }
            pendingShot = null;
        }, Math.round(shotLaunchDelay * 1000));

        pendingShot = {
            velocity: velocity.clone(),
            t,
            timeoutId: tid
        };

        e.preventDefault();
    }
});
window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

  /* ------------------------- BASIC SETUP ------------------------- */
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const container = document.getElementById("game-container");
    container.appendChild(renderer.domElement);
    /* ------------------------- SKYBOX ------------------------- */
    const skyGeo = new T.SphereGeometry(1000, 32, 32);
    const skyMat = new T.MeshBasicMaterial({
        color: 0x87ceeb,       // sky blue
        side: T.BackSide       // render inside of the sphere
    });
    const sky = new T.Mesh(skyGeo, skyMat);

    const camera = new T.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
    );
    camera.position.set(0, 150, 250);
    camera.lookAt(0, 0, 0);
    /* ------------------------- LIGHTS ------------------------------ */
    const ambient = new T.AmbientLight(0xffffff, 0.45);

    const sun = new T.DirectionalLight(0xffffff, 1.1);
    sun.position.set(200, 400, 150);

    /* ------------------------- STADIUM ----------------------------- */
    const stadium = new OldTrafford({
        x: 0,
        y: 0.5,
        z: 0,
        scale: 2,
        ballSpeed: 20,
        friction: 0.5
    });

    // ------------------------- GROUND ----------------------- */
    const groundMat = new T.MeshStandardMaterial({ color: "#118318" });
    const groundGeo = new T.PlaneGeometry(2000, 2000);
    const ground = new T.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;

    /* ------------------------- PLAYER ------------------------------ */
    const playerObj = new Player(scene, markLoaded);
    const player = playerObj.model;

    /* ------------------------- OPPONENT (unchanged) ---------------- */
    opponent = new Human({
        x: 0,
        y: 1,
        z: -10,
        scale: 1.5,
        label: "opponent"
    });
    stadium.addPlayer(playerObj.model);


    /* ------------------------- GOALKEEPER -------------------------- */
    const gk = new goalKeeper({
        x: -100,
        y: 1,
        z: 0,
        scale: 1.5
    });
    gk.group.rotation.y = Math.PI / 2;

    // Link GK with the ball
    gk.setBall(
        stadium._ball,
        stadium._stadiumScale,
        stadium._stadiumX,
        stadium._stadiumZ
    );
    stadium.addGoalKeeper(gk);

const penaltyPoint = new T.Vector3(-70, 0, 0);
let arrow = null;
let arrowAngleDeg = 0;
let arrowControlEnabled = true;
let isShooting = false;
let defaultShotSpeed = 40;
const gravity = -9.8;
let isCharging = false;
let chargeStartTime = 0;
const maxChargeTime = 2.0;
const minShotSpeed = 10;
const maxShotSpeed = 100;
const shotLaunchDelay = 0.5;
let pendingShot = null; // { velocity: Vector3, t: number, timeoutId: number }
function drawPenaltyPoint() {
    if (arrow && arrow.parent) {
        arrow.parent.remove(arrow);
        arrow = null;
    }
    const circleGeo = new T.CircleGeometry(1, 32);
    const circleMat = new T.MeshBasicMaterial({ 
        color: "#d2ccc4",
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide
    });
    const pointMarker = new T.Mesh(circleGeo, circleMat);
    pointMarker.rotation.x = -Math.PI / 2;
    pointMarker.position.copy(penaltyPoint);
    pointMarker.position.y += 1.5;
    scene.add(pointMarker);
    let ballWorldPos = pointMarker.position.clone();
    ballWorldPos.y += stadium._ballRadius + stadium._ballElevation;
    const localPos = stadium._ball.parent.worldToLocal(ballWorldPos.clone());
    stadium._ball.position.copy(localPos);

    arrow = new T.Group();
    arrow.position.copy(pointMarker.position);
    arrow.position.x += 5.0;
    arrow.position.y = 1.5;

    const shaftLength = 3.0;
    const shaftThickness = 0.3;
    const coneHeight = 0.9;
    const coneRadius = 0.3;
    const color = 0xff3333;

    const shaftGeo = new T.BoxGeometry(shaftLength, shaftThickness, shaftThickness);
    const shaftMat = new T.MeshStandardMaterial({ color: color });
    const shaft = new T.Mesh(shaftGeo, shaftMat);
    shaft.castShadow = false;
    shaft.receiveShadow = false;
    shaft.position.x = shaftLength / 2;

    const coneGeo = new T.ConeGeometry(coneRadius, coneHeight, 16);
    const coneMat = new T.MeshStandardMaterial({ color: color });
    const cone = new T.Mesh(coneGeo, coneMat);
    cone.castShadow = false;
    cone.receiveShadow = false;
    cone.rotation.z = -Math.PI / 2;
    cone.position.x = shaftLength + (coneHeight / 2);

    arrow.add(shaft);
    arrow.add(cone);

    arrow.userData.shaft = shaft;
    arrow.userData.cone = cone;
    arrow.userData.shaftLength = shaftLength;
    arrow.userData.coneHeight = coneHeight;

    const goalWorld = new T.Vector3(-100, 0, 0);
    const dir = new T.Vector3().subVectors(goalWorld, arrow.position).normalize();
    arrowAngleDeg = T.MathUtils.radToDeg(Math.atan2(dir.z, dir.x));
    arrow.rotation.y = T.MathUtils.degToRad(arrowAngleDeg);

    scene.add(arrow);
}
// "on" type functions
function onAssetsLoaded() {
    scene.add(playerObj.model);
    scene.add(opponent.group);
    playerObj.model.position.set(-10, 0.5, 0);
    playerObj.model.rotation.y = Math.PI / 2;
    playerObj.play("idle");
    opponent.group.position.set(10, 0.5, 0);
    opponent.group.rotation.y = -Math.PI / 2; // facing each other
    scene.add(ambient);
    scene.add(sun);
    scene.add(stadium.group);
    scene.add(ground);
    //scene.add(player.group);
    scene.add(gk.group);
    console.log("Assets added to scene.");
}
function onCountDownComplete() {
    countdownActive = false;
    let positionCopy = penaltyPoint.clone();
    console.log(positionCopy);
    positionCopy.y += 0.5;
    positionCopy.x += 15;
    positionCopy.z += 6; // offset to animation
    playerObj.model.position.copy(positionCopy);
    playerObj.model.rotation.y = Math.PI * 1.5;
    playerObj.play("Off_Idle"); // ready stance
    arrowControlEnabled = true;
    drawPenaltyPoint();
    let cameraPos = positionCopy.clone();
    cameraPos.x += 25;
    cameraPos.y += 20;
    cameraPos.z -= 6;
    playerCam = cameraPos;
    camera.position.copy(cameraPos);
    camera.lookAt(new T.Vector3(-100, 5, 0));
    opponent.group.visible = false;
}

// shot logic
function processShotPhysics(stadium, delta) {
    if (!stadium || !(stadium._ball && stadium._ball.userData && stadium._ball.userData.active && stadium._ball.userData.velocity)) return;
    const dt = Math.min(0.05, delta || 0.016);
    const vel = stadium._ball.userData.velocity;

    // integrate gravity (world-space)
    vel.y += gravity * dt;

    // world pos integrate
    const worldPos = stadium._ball.getWorldPosition(new T.Vector3());
    worldPos.addScaledVector(vel, dt);

    // world-space field / goal params
    const s = stadium._stadiumScale || 1;
    const ox = stadium._stadiumX || 0;
    const oz = stadium._stadiumZ || 0;

    const halfL_world = ((stadium._fieldHalfL !== undefined ? stadium._fieldHalfL : 48)) * s;
    const halfW = (stadium._fieldHalfW !== undefined ? stadium._fieldHalfW : 30) * s;
    const minX = ox - halfL_world;
    const maxX = ox + halfL_world;
    const minZ = oz - halfW;
    const maxZ = oz + halfW;

    // estimate goal X and goal zone width (world)
    const halfFieldLocal = (stadium._fieldHalfL !== undefined ? stadium._fieldHalfL : 48) + 2;
    const goalXWorld = ox - halfFieldLocal * s;
    const goalHalfWidthWorld = 10.5 * s;
    const inGoalZone = Math.abs(worldPos.z - oz) <= goalHalfWidthWorld;

    const restitution = stadium._restitution || 0.8;

    // X bounce (skip if in goal zone to allow crossing goal line)
    if (!inGoalZone) {
        if (worldPos.x > maxX) {
            worldPos.x = maxX;
            vel.x = -vel.x * restitution;
        } else if (worldPos.x < minX) {
            worldPos.x = minX;
            vel.x = -vel.x * restitution;
        }
    }
    // Z bounce
    if (worldPos.z > maxZ) {
        worldPos.z = maxZ;
        vel.z = -vel.z * restitution;
    } else if (worldPos.z < minZ) {
        worldPos.z = minZ;
        vel.z = -vel.z * restitution;
    }

    // helper to get world position of a character object
    function getWorldObj(ch) {
        if (!ch) return null;
        return ch._root || ch._model || ch.model || ch.group || ch;
    }
    function getWorldPosOf(ch) {
        const obj = getWorldObj(ch);
        if (!obj) return null;
        const v = new T.Vector3();
        if (typeof obj.getWorldPosition === "function") {
            obj.getWorldPosition(v);
            return v;
        }
        if (obj.position) return v.copy(obj.position);
        return null;
    }

    // collision handling (world-space). returns true if handled and should early-exit.
    const now = performance.now();
    const COLLIDE_COOLDOWN = 80; // ms
    function handleCollisionWith(ch, playerR_world, kickSpeedWorld) {
        const pWorld = getWorldPosOf(ch);
        if (!pWorld) return false;
        const dx = worldPos.x - pWorld.x;
        const dz = worldPos.z - pWorld.z;
        const distSq = dx * dx + dz * dz;
        const ballR = (stadium._ballRadius || 0.5) * 1.0;
        const minDist = ballR + playerR_world;
        if (distSq < minDist * minDist) {
            const last = stadium._ball.userData._lastCollideTime || 0;
            if (now - last < COLLIDE_COOLDOWN) return false;
            stadium._ball.userData._lastCollideTime = now;

            const dist = Math.sqrt(distSq) || 0.0001;
            const nx = dx / dist;
            const nz = dz / dist;

            // push out of overlap (world)
            worldPos.x = pWorld.x + nx * (minDist + 0.05);
            worldPos.z = pWorld.z + nz * (minDist + 0.05);

            // reflect horizontal component with some decay + lateral noise
            const horiz = new T.Vector3(vel.x, 0, vel.z);
            const normal = new T.Vector3(nx, 0, nz);
            const dot = horiz.dot(normal);
            const refl = horiz.clone().sub(normal.multiplyScalar(2 * dot));
            refl.multiplyScalar(0.5 + Math.random() * 0.5);
            const lateral = new T.Vector3(-nz, 0, nx).multiplyScalar((Math.random() - 0.5) * 3.0);
            refl.add(lateral);

            vel.x = refl.x;
            vel.z = refl.z;
            vel.y = Math.max(0.6, vel.y * 0.4);

            // special handling: if shooter was player and collision is with goalkeeper -> treat as "saved"
            try {
                const owner = stadium._ball.userData && stadium._ball.userData._owner;
                if (owner === "player" && ch === stadium._goalKeeper) {
                    stadium._ball.userData._goalChecked = true;
                    try { updateShot("team", currentShot, false); } catch (e) {}
                    showMissOverlay(3000);
                    currentShot++;

                    // stop flight
                    stadium._ball.userData.active = false;
                    delete stadium._ball.userData.velocity;
                    stadium._ball.userData._isPenaltyShot = false;

                    // convert to zero rolling (or set desired rolling)
                    stadium._ballVel = stadium._ballVel || new T.Vector3(0,0,0);
                    stadium._ballVel.set(0, 0, 0);

                    isShooting = false;
                    arrowControlEnabled = true;

                    // ensure gkGuess cleared
                    gkGuess = null;

                    return true;
                }
            } catch (err) {
                console.warn("GK save handling error", err);
            }

            return true;
        }
        return false;
    }

    // check collisions: goalkeeper and player (adjust radii as needed)
    if (stadium._goalKeeper) {
        const gkRadius = 2.0 * (stadium._stadiumScale || 1);
        if (handleCollisionWith(stadium._goalKeeper, gkRadius, 35)) {
            // if handled and returned true it may have been processed as "save" above
        }
    }
    if (stadium._player) {
        const pRadius = 1.2 * (stadium._stadiumScale || 1);
        handleCollisionWith(stadium._player, pRadius, 40);
    }

    // visual rotation (ball rolling look while flying)
    const speedXZ = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (speedXZ > 1e-4) {
        const axis = new T.Vector3(vel.z, 0, -vel.x).normalize();
        const radius = stadium._ballRadius || 1.0;
        const angle = (speedXZ * dt) / radius;
        const rotate_slow = Math.max(0.6, speedXZ / 10);
        stadium._ball.rotateOnAxis(axis, -angle * rotate_slow);
    }

    // friction (world horizontal)
    const friction = stadium.friction || stadium._friction || 0.5;
    const horiz = new T.Vector3(vel.x, 0, vel.z);
    horiz.multiplyScalar(Math.max(0, 1 - friction * dt));
    vel.x = horiz.x; vel.z = horiz.z;

    // ground contact and bounce
    const minY = (stadium._ballRadius || 0.5) + (stadium._ballElevation || 0.5) + 0.01 + (stadium.group ? stadium.group.position.y : 0);
    if (worldPos.y <= minY) {
        worldPos.y = minY;
        if (Math.abs(vel.y) > 0.5) {
            vel.y = -vel.y * 0.25;
        } else {
            vel.y = 0;
        }
    }

    // write back local pos for rendering
    const localPos = stadium._ball.parent.worldToLocal(worldPos.clone());
    stadium._ball.position.copy(localPos);

    // integrated goal check: when ball crosses goal line (world X <= goalXWorld)
    if (stadium._ball.userData._isPenaltyShot) {
        const goalWidth = 12 * (stadium._stadiumScale || 1);
        const halfWidth = goalWidth / 2;
        const goalHeight = 12;

        if (!stadium._ball.userData._goalChecked && worldPos.x <= goalXWorld) {
            stadium._ball.userData._goalChecked = true;
            const z = worldPos.z;
            const y = worldPos.y;
            const inZ = (z >= -halfWidth && z <= halfWidth);
            const inY = (y <= goalHeight && y >= 0);

            const owner = stadium._ball.userData._owner || "team";
            const teamKey = owner === "opponent" ? "opponent" : "team";

            // opponent shot: if player guessed same direction -> saved (miss)
            if (owner === "opponent" && stadium._ball.userData._shotDirection) {
                const shotDir = stadium._ball.userData._shotDirection;
                if (gkGuess && gkGuess === shotDir) {
                    try { updateShot(teamKey, currentShot, false); } catch (err) {}
                    showMissOverlay(3000);
                    currentShot++;
                    const reflFactor = 0.6 + Math.random() * 0.4;
                    vel.x = Math.abs(vel.x) * reflFactor;
                    vel.y = Math.max(vel.y, 1.2 + Math.random() * 1.5);
                    vel.z += (Math.random() - 0.5) * 2.5;
                    isShooting = false;
                    arrowControlEnabled = true;
                    gkGuess = null;
                    return;
                }
            }
            // normal judgement
            const made = inZ && inY;
            try { updateShot(teamKey, currentShot, made); } catch (err) {}
            if (made) showGoalOverlay(2000); else showMissOverlay(2000);
            currentShot++;

            // stop flight and cleanup
            stadium._ball.userData.active = false;
            delete stadium._ball.userData.velocity;
            stadium._ball.userData._isPenaltyShot = false;
            isShooting = false;
            arrowControlEnabled = true;
            gkGuess = null;
            return;
        }
    }

    // if ball on ground and slow -> switch to local rolling
    const horizSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    const onGround = Math.abs(worldPos.y - minY) < 0.05;
    if (onGround && horizSpeed < 0.5 && Math.abs(vel.y) < 0.5) {
        // convert to local rolling
        stadium._ball.userData.active = false;
        delete stadium._ball.userData.velocity;
        stadium._ballVel = stadium._ballVel || new T.Vector3(0,0,0);
        stadium._ballVel.set(vel.x / s, 0, vel.z / s);

        // IMPORTANT: do NOT redo updateShot/showMissOverlay here if _goalChecked is false.
        // If you want to mark a non-checked shot as miss here, do it only if desired.
        stadium._ball.userData._isPenaltyShot = false;

        isShooting = false;
        arrowControlEnabled = true;
        gkGuess = null;
    }
}

export function main() {
    scene.add(sky);
    /* ------------------------- UPDATE LOOP ------------------------- */
    let introPhase = 0;
    let introTime = 0;
    let introDone = false;
    function update(delta) {
        if (!all_assets_loaded) return;
        if (game_mode === "loading") return;
        playerObj.update(delta);
        /* ---------- CAMERA CINEMATIC INTRO ---------- */
        if (!introDone && (game_mode === "waiting_start" || game_mode === "intro")) {
            introTime += delta;

            // Phase 0: Fly around stadium (circle path)
            if (introPhase === 0) {
                const radius = 350;
                const speed = 0.3; // radians per sec
                const angle = introTime * speed;

                camera.position.set(
                    Math.cos(angle) * radius,
                    120,
                    Math.sin(angle) * radius
                );
                camera.lookAt(0, 30, 0);

                if (introTime > 10) {   // 10 seconds
                    introPhase = 1;
                    introTime = 0;
                }
            }

            // Phase 1: Pan across the audiences (side sweep)
            else if (introPhase === 1) {
                camera.position.lerp(new T.Vector3(0, 300, 80), delta * 0.4);
                camera.lookAt(0, 50, 0);

                if (introTime > 6) {
                    if (game_mode === "waiting_start") {
                        introPhase = 1.5;
                        introTime = 0;
                    }
                    else {
                        preStartLogic();
                        introPhase = 2;
                        introTime = 0;
                    }
                }
            }
            else if (introPhase === 1.5) {
                camera.position.lerp(new T.Vector3(350, 120, 0), delta * 0.4);
                camera.lookAt(0, 50, 0);
                if (introTime > 8) {
                    introPhase = 0;
                    introTime = 0;
                }
            }
            // Phase 2: Zoom to penalty shooter
            else if (introPhase === 2) {   
                playerObj.play("idle");
                const shooterPos = new T.Vector3(0, 5, -10);

                camera.position.lerp(
                    new T.Vector3(0, 5, 30),
                    delta
                );
                camera.lookAt(shooterPos);

                if (introTime > 3) {
                    introDone = true;
                    game_mode = "pre_start"
                }
            }
            return; // IMPORTANT: skip gameplay updates during intro
        }
        if (game_mode === "pre_start") {
            // Handle pre-start logic
            playerObj.play("idle");
            camera.position.set(0, 5, 30);
            camera.lookAt(0, 5, -10);
            if (countdownActive) {
                countdownTime -= delta;
                let display = Math.ceil(countdownTime);
                if (display <= 0) {
                    countdownActive = false;
                    countdownDisplay.style.opacity = 0;
                    game_mode = "playing";
                    onCountDownComplete();
                } else {
                    countdownDisplay.textContent = display.toString();
                }
            }
            return; // skip gameplay updates
        }
        if (game_mode === "playing") {
            if (isCharging && arrow && arrow.userData && arrow.userData.shaft) {
              const elapsed = Math.min((performance.now() - chargeStartTime) / 1000, maxChargeTime);
              const t = elapsed / maxChargeTime; // 0..1
              const baseScale = 1.0;
              const extra = 1.0;
              arrow.userData.shaft.scale.x = baseScale + extra * t;
              arrow.userData.cone.position.x = arrow.userData.shaftLength * arrow.userData.shaft.scale.x + (arrow.userData.coneHeight / 2);
              arrow.userData.shaft.material.emissive = new T.Color(0x330000 + Math.floor(0x00ff00 * t));
            }
            // Count if win
            if (playerIndex == 5 && opponentIndex == 5) {
                let teamScore = 0, opponentScore = 0;
                for (let i = 0; i < 5; i++)
                    if (score.team[i].textContent == "⚽️") teamScore++;
                for (let i = 0; i < 5; i++)
                    if (score.opponent[i].textContent == "⚽️") opponentScore++;
                if (teamScore > opponentScore) {
                    whoWins = "team";
                } else if (opponentScore > teamScore) {
                    whoWins = "opponent";
                } else {
                    whoWins = "draw";
                }
                console.log("Game Over! Winner:", whoWins);
                setTimeout(() => {
                    game_mode = "game_over";
                }, 3000);
            }
        }
        /* ---------- GAME OVER CELEBRATION ---------- */
        if (game_mode === "game_over") {
            opponent.group.visible = false;
            gk.group.visible = false;
            arrowControlEnabled = false;
            stadium._ball.visible = false;
            if (whoWins === "team") {
                console.log("Team wins celebration!");
                winBanner.textContent = "You Win!";
                winBanner.classList.add("show");
                if (!playerObj._celebrationStarted) {
                    playerObj.model.position.set(0, 0.5, 0);
                    playerObj.play("Dance");
                    playerObj._celebrationStarted = true;
                    playerObj._celebrationPhase = "dance";
                    playerObj._danceStart = performance.now();
                    playerObj._danceDuration = 25.0;
                    playerObj._danceRadius = 14;
                    playerObj._danceHeight = 4;
                }
                if (playerObj._celebrationPhase === "dance") {
                    playerObj._danceRadius += 0.6 * delta;
                    playerObj._danceRadius = Math.max(playerObj._danceRadius, 12);
                    playerObj._danceHeight += 0.2 * delta;
                    playerObj._danceHeight = Math.max(playerObj._danceHeight, 6);

                    const elapsed = (performance.now() - playerObj._danceStart) / 1000;
                    const t = Math.min(1, elapsed / playerObj._danceDuration);
                    const angle = t * Math.PI * 2; // 0..2PI
                    const radius = playerObj._danceRadius;
                    const height = playerObj._danceHeight;
                    const center = new T.Vector3();
                    playerObj.model.getWorldPosition(center);
                    camera.position.set(
                        center.x + Math.cos(angle) * radius,
                        center.y + height,
                        center.z + Math.sin(angle) * radius
                    );
                    camera.lookAt(new T.Vector3(0, 5, 0));
                    if (elapsed >= playerObj._danceDuration) {
                        playerObj._celebrationPhase = "done";
                    }
                }
            }
            else if (whoWins === "opponent") {
                console.log("Opponent wins!");
                winBanner.textContent = "You Lose!";
                winBanner.style.background = "rgba(247, 41, 41, 0.7)";
                winBanner.classList.add("show");
            }
            else {
                console.log("It's a draw!");
                winBanner.textContent = "It's a Draw!";
                winBanner.style.background = "rgba(255, 255, 255, 0.7)";
                winBanner.classList.add("show");
            }
        }
        processShotPhysics(stadium, delta); 

    /* ---------- GAME UPDATES AFTER INTRO ---------- */
        if (stadium.update) stadium.update(delta);
        playerObj.update(delta);
        if (gk.update) gk.update(delta);
        if (mixer) mixer.update(delta);
    }

    let last = performance.now();

    function loop() {
        requestAnimationFrame(loop);

        const now = performance.now();
        const delta = (now - last) / 1000;
        last = now;

        update(delta);
        // no controls.update()
        renderer.render(scene, camera);
    }

    loop();
}
