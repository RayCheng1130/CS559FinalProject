/*jshint esversion: 6 */
// @ts-check

import { GrWorld } from "./libs/CS559-Framework/GrWorld.js";
import { main } from "./new/main.js"; // ONLY the soccer game scene

// Create a fullscreen world
function createWorld() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const world = new GrWorld({
    width: w,
    height: h,
    groundplanesize: 400,
    where: "div1", // attach canvas to <div id="div1">
  });

  // Add your soccer scene
  main(world);

  // Optional: highlight the stadium object if you still use this
  function highlight(obName) {
    const toHighlight = world.objects.find((ob) => ob.name === obName);
    if (toHighlight) {
      toHighlight.highlighted = true;
    }
  }
  highlight("OldTrafford");

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

// actually build the world
createWorld();
