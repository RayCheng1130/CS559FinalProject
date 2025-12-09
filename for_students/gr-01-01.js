/*jshint esversion: 6 */
// @ts-check
import { GrWorld } from "../libs/CS559-Framework/GrWorld.js";
import { WorldUI } from "../libs/CS559-Framework/WorldUI.js";

// --- TOGGLE THIS IMPORT TO SWITCH BETWEEN GAME AND TRAINER ---
import { main } from "../new/main.js";   // <--- The Game
// import { main } from "../new/train.js"; // <--- The Gym

let world = new GrWorld({
    width: 800,
    height: 600,
    groundplanesize: 400
});

main(world);

function highlight(obName) {
    const toHighlight = world.objects.find(ob => ob.name === obName);
    if (toHighlight) {
        toHighlight.highlighted = true;
    } else {
        console.log(`Note: ${obName} not found (safe to ignore in training mode)`);
    }
}

// Safe highlighting
highlight("OldTrafford");

// world.ui = new WorldUI(world);
world.go();