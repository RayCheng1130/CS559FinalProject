/*jshint esversion: 6 */
// @ts-check

import { GrWorld } from "./libs/CS559-Framework/GrWorld.js";
import { main as mainGame } from "./new/main.js";   // soccer game scene
import { main as mainTrain } from "./new/train.js"; // training gym scene

// read mode from URL, default to "game"
function getModeFromURL() {
  const params = new URLSearchParams(window.location.search);
  const m = params.get("mode");
  if (m === "train") return "train";
  return "game";
}

// create the world and load the appropriate scene
function createWorld(mode) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const world = new GrWorld({
    width: w,
    height: h,
    groundplanesize: 400,
    where: "div1", // attach canvas to <div id="div1">
  });

  if (mode === "train") {
    // training gym
    mainTrain(world);
  } else {
    // default: full stadium game
    mainGame(world);

    // Optional: highlight the stadium object
    function highlight(obName) {
      const toHighlight = world.objects.find((ob) => ob.name === obName);
      if (toHighlight) {
        toHighlight.highlighted = true;
      }
    }
    highlight("OldTrafford");
  }

  // Start animation
  world.go();

  // Handle window resize so it always fills the window
  window.addEventListener("resize", () => {
    const newW = window.innerWidth;
    const newH = window.innerHeight;

    if (world.renderer && world.camera) {
      world.renderer.setSize(newW, newH);
      world.camera.aspect = newW / newH;
      world.camera.updateProjectionMatrix();
    }
  });

  return world;
}

// wire up the top bar buttons to switch modes via URL
function setupModeButtons(currentMode) {
  const btnGame = document.getElementById("btn-game");
  const btnTrain = document.getElementById("btn-train");
  const status = document.getElementById("mode-status");

  if (status) {
    status.textContent = currentMode === "train" ? "Training Gym" : "Game";
  }

  if (btnGame) {
    btnGame.onclick = () => {
      const params = new URLSearchParams(window.location.search);
      params.set("mode", "game");
      // reload page into game mode
      window.location.search = params.toString();
    };
  }

  if (btnTrain) {
    btnTrain.onclick = () => {
      const params = new URLSearchParams(window.location.search);
      params.set("mode", "train");
      // reload page into training mode
      window.location.search = params.toString();
    };
  }
}

// actually build the world, using the mode from URL
const mode = getModeFromURL();
setupModeButtons(mode);
createWorld(mode);
