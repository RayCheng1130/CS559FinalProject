/*jshint esversion: 6 */
// @ts-check

//
// CS559 - Graphics Town - Workbook 12
// Example Code: 
// Example "Town"
//
// This sets up the town loading different objects. 
//
// It should be called from the onload function, after the world has been created

/** These imports are for the examples - feel free to remove them */
import { OldTrafford } from "./Old_Trafford.js";
import { Human } from "./human.js";
import { goalKeeper } from "./goalKeeper.js"

/********************************************************************** */
/** EXAMPLES - student should not use this! It is just for reference    */
/** you may use the sample objects, but not the sample layout           */
/***/
export function main(world) {
  // Add Old Trafford Stadium model
  let stadium = new OldTrafford({ x: 0, y: 0.5, z: 0, scale: 2, ballSpeed: 20, friction: 0.5 });
  // frction: 0: smooth, 1: rough
  world.add(stadium);

  // Add the human figure
  const player = new Human({
      x: 0,
      y: 1,
      z: -10,
      scale: 1.5,
      label: "player"
  });
  world.add(player);

  stadium.addPlayer(player);
  const gk = new goalKeeper({
    x: -100,
    y: 1,
    z: 0,
    scale: 1.5,
    mode: "play",
    moveSpeed: 12
  });
  world.add(gk);

  // Link GK with the ball (needed for TF input)
  gk.setBall(
      stadium._ball, 
      stadium._stadiumScale,
      stadium._stadiumX,
      stadium._stadiumZ
  );
  stadium.addGoalKeeper(gk);
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.style.position = "absolute";
  input.style.top = "50px";
  input.style.left = "10px";
  input.onchange = async (e) => {
      // @ts-ignore
      const files = e.target.files;
      let json, bin;
      for (let f of files) {
          if (f.name.endsWith(".json")) json = f;
          if (f.name.endsWith(".bin")) bin = f;
      }
      if (json && bin) await gk.loadBrain([json, bin]);
  };
  document.body.appendChild(input);

}

