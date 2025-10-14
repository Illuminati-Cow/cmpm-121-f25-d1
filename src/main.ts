import "./style.css";

declare global {
  var runGameLoop: boolean;
}

type GameState = {
  currency: number;
  upgrades: Map<number, Upgrade>;
};

type Upgrade = {
  id: number;
  name: string;
  quantity: number;
};

//#region DOM Elements
const mainClicker = document.getElementById(
  "main-clicker",
) as HTMLButtonElement;
const currencyDisplay = document.getElementById(
  "currency-display",
) as HTMLParagraphElement;
const _canvas = document.getElementById("game-canvas") as HTMLCanvasElement;

//#endregion

globalThis.runGameLoop = true;
let delta: number;
let lastUpdate: number = performance.now();
let clicksThisFrame: number = 0;
const clickPower = 1;

mainClicker.addEventListener("click", () => clicksThisFrame++);

const gameState: GameState = {
  currency: 0,
  upgrades: new Map<number, Upgrade>(),
};

function enterGameLoop() {
  delta = performance.now() - lastUpdate;
  lastUpdate = performance.now();
  update(delta);
  requestAnimationFrame(enterGameLoop);
}

function update(delta: number) {
  consumeClicks(clicksThisFrame);
  clicksThisFrame = 0;
  tickUpgrades(delta);
  updateDisplay();
}

function consumeClicks(clicks: number) {
  gameState.currency += clicks * clickPower;
}

function tickUpgrades(_delta: number) {
  return;
}

let displayedCurrency = 0;
const currencyAnimationSpeed = 10;
function updateDisplay() {
  // Animate the displayed currency towards the actual currency
  const diff = gameState.currency - displayedCurrency;
  displayedCurrency += diff * (currencyAnimationSpeed * delta / 1000);

  // Snap to exact value if very close to avoid floating point issues
  if (Math.abs(gameState.currency - displayedCurrency) < 0.01) {
    displayedCurrency = gameState.currency;
  }

  currencyDisplay!.textContent = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(displayedCurrency);
}

// Start Game Loop
enterGameLoop();
