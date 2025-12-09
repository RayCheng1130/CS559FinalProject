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
import { BallChaser } from "./ballChaser.js";

/********************************************************************** */
/** EXAMPLES - student should not use this! It is just for reference    */
/** you may use the sample objects, but not the sample layout           */
/***/
export function main(world) {
  // Add Old Trafford Stadium model
  let stadium = new OldTrafford({ x: 0, y: 0.5, z: 0, scale: 2, ballSpeed: 0, friction: 0.5 });
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

  const chase = new BallChaser({
    x: 20,
    y: 1,
    z: 0,
    scale: 1.5,
    moveSpeed: 5,
    label: "Chaser"
  });
  world.add(chase);

  // Link GK with the ball (needed for TF input)
  gk.setBall(
      stadium._ball, 
      stadium._stadiumScale,
      stadium._stadiumX,
      stadium._stadiumZ
  );
  stadium.addGoalKeeper(gk);

  chase.setBall(
    stadium._ball,
    stadium._stadiumScale,
    stadium._stadiumX,
    stadium._stadiumZ
  );
  stadium.addChase(chase);

  const btnSimple = document.createElement("button");
  btnSimple.textContent = "Simple GK";
  btnSimple.style.position = "absolute";
  btnSimple.style.top = "50px";
  btnSimple.style.left = "10px";
  btnSimple.onclick = () => {
    gk.loadPresetBrain("simple").catch(err => console.error(err));
  };
  document.body.appendChild(btnSimple);

  const btnHard = document.createElement("button");
  btnHard.textContent = "Hard GK";
  btnHard.style.position = "absolute";
  btnHard.style.top = "50px";
  btnHard.style.left = "100px";
  btnHard.onclick = () => {
    gk.loadPresetBrain("hard").catch(err => console.error(err));
  };
  document.body.appendChild(btnHard);

}

