import "./style.css";

declare global {
  var runGameLoop: boolean;
}

globalThis.runGameLoop = true;
let renderDelta: number;
let lastRenderUpdate: number = performance.now();
let clickPower = 1;

// Pending clicks to be consumed in logic updates
let pendingClicks = 0;

// Fixed timestep for logic updates (60 ticks per second)
const LOGIC_TICK_RATE = 60;
const LOGIC_TIME_STEP = 1000 / LOGIC_TICK_RATE; // ~16.67ms

type SerializedGameState = {
  currency: number;
  upgrades: Map<number, number>;
};

type GameState = {
  currency: number;
  upgrades: Array<PurchasedUpgrade>;
};

type Upgrade = {
  id: number;
  name: string;
  type: string;
  baseCost: number;
};

type PurchasedUpgrade = Upgrade & {
  level: number;
};

//#region DOM Elements
const mainClicker = document.getElementById(
  "main-clicker",
) as HTMLButtonElement;
const currencyDisplay = document.getElementById(
  "currency-display",
) as HTMLParagraphElement;
const clickIncomeDisplay = document.getElementById(
  "click-income-display",
) as HTMLSpanElement;
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

//#region Load Data
const upgradeData: Upgrade[] = await fetch("data/upgrades.json")
  .then((res) => res.json())
  .then((data) => data as Upgrade[]);
//#endregion

mainClicker.addEventListener("click", () => pendingClicks++);
miningTabButton.addEventListener("click", () => swapUpgradeTab("mining"));
constructionTabButton.addEventListener(
  "click",
  () => swapUpgradeTab("construction"),
);

const gameState: GameState = {
  currency: 0,
  upgrades: [],
};

swapUpgradeTab("mining");

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
  listItem.dataset.upgradeId = upgrade.id.toString();
  nameElem.textContent = upgrade.name;
  costElem.textContent = `$${
    calculateCost(getUpgradeLevel(upgrade.id), upgrade.baseCost).toFixed(2)
  }`;
  const upgradeButton = fragment.querySelector(".upgrade-button")!;
  upgradeButton.addEventListener("click", () => purchaseUpgrade(upgrade.id));

  return listItem;
}

function updateUpgradeCost(upgradeId: number) {
  //TODO: Update the displayed cost of the upgrade based on its new level
  const upgrade = upgradeData.find((u) => u.id === upgradeId);
  if (!upgrade) return;
  const currentLevel =
    gameState.upgrades.find((u) => u.id === upgradeId)?.level || 0;
  const newCost = calculateCost(currentLevel, upgrade.baseCost);

  // Find the corresponding upgrade element in the DOM and update its cost display
  const upgradeElements = upgradeList.querySelectorAll("li");
  upgradeElements.forEach((elem) => {
    const costElem = elem.querySelector(".upgrade-cost");
    if (costElem && elem.dataset.upgradeId === upgradeId.toString()) {
      costElem.textContent = `$${newCost.toFixed(2)}`;
    }
  });
}

function updatePassiveIncome() {
  // TODO: Calculate and update passive income based on purchased upgrades
  let income = 0;
  gameState.upgrades.forEach((upgrade) => {
    if (upgrade.type === "construction") {
      income += upgrade.level * 0.1; // PLACEHOLDER
    }
  });
  incomeDisplay.textContent = `$${income.toFixed(2)}`;
}

function calculateCost(level: number, baseCost: number): number {
  return 1.5 ** level * baseCost;
}

function calculateClickValue(): number {
  return clickPower;
}

function getUpgradeLevel(upgradeId: number): number {
  const upgrade = gameState.upgrades.find((u) => u.id === upgradeId);
  return upgrade ? upgrade.level : 0;
}

let lastTick = performance.now();
let clicksThisSecond = 0;

function logicUpdate() {
  const delta = (performance.now() - lastTick) / 1000;
  lastTick = performance.now();
  consumeClicks(pendingClicks);
  clicksThisSecond += pendingClicks;
  pendingClicks = 0;
  tickUpgrades(delta);
}

function enterRenderLoop() {
  renderDelta = performance.now() - lastRenderUpdate;
  lastRenderUpdate = performance.now();
  updateStatsDisplay();
  requestAnimationFrame(enterRenderLoop);
}

function consumeClicks(clicks: number) {
  gameState.currency += clicks * calculateClickValue();
}

function tickUpgrades(_delta: number) {
  gameState.upgrades.forEach((upgrade) => {
    if (upgrade.type === "construction") {
      gameState.currency += upgrade.level * 0.1 * _delta; // PLACEHOLDER
    }
  });
}

let displayedCurrency = 0;
const currencyAnimationSpeed = 10;
function updateStatsDisplay() {
  // Animate the displayed currency towards the actual currency
  const diff = gameState.currency - displayedCurrency;
  if (renderDelta > 1000) {
    // If the frame took too long, snap to the actual value to avoid large jumps
    displayedCurrency = gameState.currency;
  } else {
    displayedCurrency += diff * (currencyAnimationSpeed * renderDelta / 1000);
  }

  // Snap to exact value if very close to avoid floating point issues
  if (Math.abs(gameState.currency - displayedCurrency) < 0.01) {
    displayedCurrency = gameState.currency;
  }

  currencyDisplay!.textContent = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(displayedCurrency);
}

function updateUpgradeDisplay() {
  const upgradeElements = upgradeList.querySelectorAll("li");
  upgradeElements.forEach((elem) => {
    const upgradeId = Number(elem.dataset.upgradeId);
    const upgrade = upgradeData.find((u) => u.id === upgradeId);
    const purchasedUpgrade = gameState.upgrades.find((u) => u.id === upgradeId);
    const upgradeButton = elem.querySelector(
      ".upgrade-button",
    ) as HTMLButtonElement;
    const levelElem = elem.querySelector(".upgrade-level") as HTMLElement;

    // Highlight purchased upgrades and show level
    if (purchasedUpgrade) {
      elem.classList.add("purchased");
      if (levelElem) {
        levelElem.textContent = `Level: ${purchasedUpgrade.level}`;
      }
    } else {
      elem.classList.remove("purchased");
      if (levelElem) {
        levelElem.textContent = "";
      }
    }

    // Disable button if not affordable
    const currentLevel = purchasedUpgrade?.level || 0;
    const cost = calculateCost(currentLevel, upgrade!.baseCost);
    upgradeButton.disabled = gameState.currency < cost;
  });
}

function updatePerformanceMetrics() {
  const fps = (1000 / renderDelta).toFixed(1);
  const msPerFrame = renderDelta.toFixed(2);
  performanceMetrics!.textContent = `${fps} FPS | ${msPerFrame} ms/frame`;
}

// TODO: Buffer the upgrade purchases so they are processed in the main game loop
function purchaseUpgrade(upgradeId: number) {
  const upgrade = upgradeData.find((u) => u.id === upgradeId);
  if (!upgrade) return;
  const purchasedUpgrade = gameState.upgrades.find((u) => u.id === upgradeId);
  const currentLevel = purchasedUpgrade?.level || 0;
  const cost = calculateCost(currentLevel, upgrade.baseCost);
  if (gameState.currency < cost) return;

  gameState.currency -= cost;
  if (purchasedUpgrade) {
    purchasedUpgrade.level += 1;
  } else {
    gameState.upgrades.push({ ...upgrade, level: 1 });
  }

  updateUpgradeCost(upgradeId);

  if (upgrade.type === "construction") {
    updatePassiveIncome();
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
setInterval(() => {
  document.title = `NuclearClick - $${gameState.currency.toFixed(2)}`;
}, 2000);
setInterval(() => {
  clickIncomeDisplay.textContent = `+${
    calculateClickValue() * clicksThisSecond
  }`;
  clicksThisSecond = 0;
}, 1000);

// Start loops
setInterval(logicUpdate, LOGIC_TIME_STEP);
enterRenderLoop();
