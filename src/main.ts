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
  type: string;
  baseCost: number;
  costScaling: null | ((level: number) => number);
};

//#region DOM Elements
const mainClicker = document.getElementById(
  "main-clicker",
) as HTMLButtonElement;
const currencyDisplay = document.getElementById(
  "currency-display",
) as HTMLParagraphElement;
const clickPowerDisplay = document.getElementById(
  "click-power-display",
) as HTMLParagraphElement;
const incomeDisplay = document.getElementById(
  "income-display",
) as HTMLParagraphElement;
const _canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const performanceMetrics = document.getElementById(
  "performance-metrics",
) as HTMLParagraphElement;

// Upgrades
const upgradeTemplate = document.getElementById(
  "upgrade-item-template",
) as HTMLTemplateElement;
const upgradeList = document.getElementById(
  "upgrades-list",
) as HTMLOListElement;
const constructionTabButton = document.getElementById(
  "construction-tab-button",
) as HTMLButtonElement;
const miningTabButton = document.getElementById(
  "mining-tab-button",
) as HTMLButtonElement;
//#endregion

const upgradeData: Upgrade[] = [
  {
    id: 0,
    name: "Ore Extractor",
    type: "construction",
    baseCost: 100,
    costScaling: null,
  },
  {
    id: 1,
    name: "Drill Upgrade",
    type: "mining",
    baseCost: 10,
    costScaling: null,
  },
];

globalThis.runGameLoop = true;
let delta: number;
let lastUpdate: number = performance.now();
let clicksThisFrame: number = 0;
let clickPower = 1;

mainClicker.addEventListener("click", () => clicksThisFrame++);
miningTabButton.addEventListener("click", () => swapUpgradeTab("mining"));
constructionTabButton.addEventListener(
  "click",
  () => swapUpgradeTab("construction"),
);
swapUpgradeTab("mining");

const gameState: GameState = {
  currency: 0,
  upgrades: new Map<number, Upgrade>(),
};

// TODO: Implement upgrade purchasing, effects, and scaling
// TODO: Consider pre-creating DOM elements for upgrades and reusing them
function swapUpgradeTab(tab: string) {
  upgradeList.innerHTML = "";
  const filteredUpgrades = upgradeData.filter((upgrade) =>
    upgrade.type === tab
  );
  filteredUpgrades.forEach((upgrade) => {
    upgradeList.appendChild(createUpgradeElement(upgrade));
  });
}

function createUpgradeElement(upgrade: Upgrade): HTMLLIElement {
  const fragment = document.importNode(
    upgradeTemplate.content,
    true,
  );
  const listItem = fragment.querySelector("li")!;
  const nameElem = fragment.querySelector(".upgrade-name")!;
  const costElem = fragment.querySelector(".upgrade-cost")!;
  nameElem.textContent = upgrade.name;
  costElem.textContent = `$${upgrade.baseCost.toFixed(2)}`;
  const upgradeButton = fragment.querySelector(".upgrade-button")!;
  upgradeButton.addEventListener("click", () => purchaseUpgrade(upgrade.id));

  return listItem;
}

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

function updatePerformanceMetrics() {
  const fps = (1000 / delta).toFixed(1);
  const msPerFrame = delta.toFixed(2);
  performanceMetrics!.textContent = `${fps} FPS | ${msPerFrame} ms/frame`;
}

// TODO: Buffer the upgrade purchases so they are processed in the main game loop
function purchaseUpgrade(upgradeId: number) {
  const upgrade = upgradeData.find((u) => u.id === upgradeId);
  if (!upgrade) return;

  if (gameState.currency >= upgrade.baseCost) {
    gameState.currency -= upgrade.baseCost;
    gameState.upgrades.set(upgradeId, upgrade);
  }

  if (upgrade.type === "construction") {
    setInterval(() => {
      gameState.currency += 1; // PLACEHOLDER
    }, 1000);
    incomeDisplay.textContent = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(1); // PLACEHOLDER
  }
  if (upgrade.type === "mining") {
    clickPower += 1; // PLACEHOLDER
    clickPowerDisplay.textContent = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(clickPower);
  }
}

// Update performance metrics every second
setInterval(updatePerformanceMetrics, 1000);

// Start Game Loop
enterGameLoop();
