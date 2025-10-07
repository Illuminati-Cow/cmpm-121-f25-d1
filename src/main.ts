import "./style.css";

declare global {
  interface Window {
    runGameLoop: boolean
  }
}

type GameState = {
  currency: number,
  upgrades: Map<number, Upgrade>,
};

type Upgrade = {
  id: number,
  name: string,
  quantity: number,
};

const mainClicker = document.getElementById("main-clicer")
if (!mainClicker)
  throw new Error("mainClicker element not found.");
mainClicker.addEventListener("click", () => clicksThisFrame++)

window.runGameLoop = true;
let delta: number
let lastUpdate: number = performance.now();
let clicksThisFrame: number = 0
let clickPower = 1;

const gameState: GameState = {
  currency: 0,
  upgrades: new Map<number, Upgrade>()
}

function enterGameLoop()
{
  delta = performance.now() - lastUpdate;
  lastUpdate = performance.now();
  update(delta);
  requestAnimationFrame(enterGameLoop)
}

function update(delta: number)
{
  consumeClicks(clicksThisFrame);
  clicksThisFrame = 0;
  tickUpgrades(delta);
}

function consumeClicks(clicks: number)
{
  gameState.currency += clicks * clickPower;
}

function tickUpgrades(delta: number)
{
  return;
}

// Start Game Loop
enterGameLoop();