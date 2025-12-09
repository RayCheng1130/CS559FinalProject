/*jshint esversion: 6 */
// @ts-check
import { GrWorld } from "./libs/CS559-Framework/GrWorld.js";

/**
 * Helper: get current mode from URL (?mode=game / ?mode=train)
 */
function getModeFromURL() {
  const url = new URL(window.location.href);
  const mode = url.searchParams.get("mode");
  if (mode === "train" || mode === "game") return mode;
  return "game"; // default
}

/**
 * Helper: update URL and reload page when the user changes mode.
 */
function switchMode(mode) {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", mode);
  window.location.href = url.toString();
}

/**
 * Set the UI labels and button states
 */
function setupModeUI(mode) {
  const status = document.getElementById("mode-status");
  if (status) {
    status.textContent = mode === "train" ? "Training Gym" : "Game";
  }

  const btnGame = document.getElementById("btn-game");
  const btnTrain = document.getElementById("btn-train");
  if (btnGame && btnTrain) {
    btnGame.disabled = (mode === "game");
    btnTrain.disabled = (mode === "train");

    btnGame.addEventListener("click", () => switchMode("game"));
    btnTrain.addEventListener("click", () => switchMode("train"));
  }
}

// --------- MAIN LOADER ---------

const mode = getModeFromURL();
setupModeUI(mode);

// Dynamically import the correct scene module
let sceneModule;
if (mode === "train") {
  // Training Gym scene (your train.js) :contentReference[oaicite:4]{index=4}
  sceneModule = await import("./new/train.js");
} else {
  // Game scene (your main.js) :contentReference[oaicite:5]{index=5}
  sceneModule = await import("./new/main.js");
}

const { main } = sceneModule;

// Create world like before
const world = new GrWorld({
  width: 800,
  height: 600,
  groundplanesize: 400,
});

// Add whichever scene the user chose
main(world);

// Optional: highlight stadium in game mode, safe if not present in gym mode
function highlight(obName) {
  const toHighlight = world.objects.find((ob) => ob.name === obName);
  if (toHighlight) {
    toHighlight.highlighted = true;
  } else {
    console.log(`Note: ${obName} not found (safe to ignore in this mode)`);
  }
}
highlight("OldTrafford");

// You can enable the WorldUI if you want in both modes:
world.ui = new WorldUI(world);

// Start the animation loop
world.go();
