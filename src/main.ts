import { drawClickEffects } from "./effects.ts";
import "./style.css";
import {
  PurchasedUpgrade,
  Upgrade,
  upgradeData,
  UpgradeType,
} from "./upgrades.ts";
import { formatDollar } from "./utilities.ts";

declare global {
  var runGameLoop: boolean;
  function setMoney(money: number): number;
}

globalThis.runGameLoop = true;
globalThis.setMoney = (money: number) => gameState.currency = money;

const LOGIC_TICK_RATE = 60;
const LOGIC_TIME_STEP = 1000 / LOGIC_TICK_RATE;

//#region Types

type SerializedGameState = {
  currency: number;
  upgrades: Map<number, number>;
};

type GameState = {
  currency: number;
  upgrades: Array<PurchasedUpgrade>;
};

interface UpgradePurchasedEventDetail {
  upgrade: PurchasedUpgrade;
}

//#endregion

const clickSound = new Audio("click.wav");
const upgradeSound = new Audio("upgrade_thump.wav");
clickSound.volume = 0.5;
clickSound.load();
document.body.appendChild(clickSound);

//#region DOM Elements
const mainClicker = document.getElementById(
  "main-clicker",
) as HTMLButtonElement;
mainClicker.addEventListener("click", () => pendingClicks++);

const clickerTabButton = document.getElementById(
  "clicker-tab",
) as HTMLButtonElement;
clickerTabButton.addEventListener("click", () => swapUpgradeTabs("click"));
const passiveTabButton = document.getElementById(
  "passive-tab",
) as HTMLButtonElement;
passiveTabButton.addEventListener("click", () => swapUpgradeTabs("passive"));

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

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
canvas.width = 800;
canvas.height = 300;
const dpr = globalThis.window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
const ctx = canvas.getContext("2d")!;
ctx.scale(dpr, dpr);
canvas.style.width = rect.width + "px";
canvas.style.height = rect.height + "px";
globalThis.window.addEventListener("resize", () => {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
  console.log("Resized canvas to:", canvas.width, canvas.height);
});

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
//#endregion

//#region Game State
const gameState: GameState = {
  currency: 0,
  upgrades: upgradeData.map((u) => ({ ...u, level: 0 })),
};
let pendingClicks = 0;

upgradeList.innerHTML = "";
upgradeData.forEach((upgrade) => {
  upgradeList.appendChild(createUpgradeElement(upgrade));
});
swapUpgradeTabs("passive");
//#endregion

//#region Upgrade System
document.addEventListener("upgrade-purchased", (e) => {
  const detail = (e as CustomEvent<UpgradePurchasedEventDetail>).detail;
  updateUpgrade(detail.upgrade);
  updatePassiveIncomeDisplay();
  clickPowerDisplay.textContent = formatDollar(calculateClickPower(), 1000);
  upgradeSound.currentTime = 0;
  upgradeSound.play();
});

function tickUpgrades(delta: number) {
  const passiveIncome = calculatePassiveIncome();
  for (const upgrade of gameState.upgrades) {
    if (upgrade.type !== UpgradeType.PASSIVE) continue;
    gameState.currency += upgrade.getValue({
      income: passiveIncome,
    }) * delta;
  }
}

function purchaseUpgrade(upgradeId: number) {
  const purchasedUpgrade = gameState.upgrades.find((u) => u.id === upgradeId)!;
  if (gameState.currency < purchasedUpgrade.getCost()) return;

  gameState.currency -= purchasedUpgrade.getCost();
  purchasedUpgrade.level += 1;

  document.dispatchEvent(
    new CustomEvent<UpgradePurchasedEventDetail>("upgrade-purchased", {
      detail: { upgrade: purchasedUpgrade },
    }),
  );
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
  costElem.textContent = formatDollar(
    upgrade.getCost(),
    1000,
  );

  const upgradeButton = fragment.querySelector(".upgrade-button")!;
  upgradeButton.addEventListener("click", () => purchaseUpgrade(upgrade.id));

  const tooltip = document.getElementById("upgrade-tooltip")!;
  let tooltipUpdateHandler: (() => void) | null = null;
  const getUpgrade = () =>
    gameState.upgrades.find((u) => u.id === upgrade.id) ??
      upgrade as PurchasedUpgrade;

  upgradeButton.addEventListener("mouseover", () => {
    updateUpgradeTooltipContent(getUpgrade());
    openTooltip();
    tooltipUpdateHandler = () => updateUpgradeTooltipContent(getUpgrade());
    document.addEventListener("upgrade-purchased", tooltipUpdateHandler);
  });

  upgradeButton.addEventListener("mouseout", () => {
    closeTooltip();
    if (tooltipUpdateHandler) {
      document.removeEventListener("upgrade-purchased", tooltipUpdateHandler);
      tooltipUpdateHandler = null;
    }
  });

  return listItem;

  function openTooltip() {
    tooltip.style.display = "block";
    const tooltipRect = tooltip.getBoundingClientRect();
    const rect = upgradeButton.getBoundingClientRect();
    tooltip.style.top = `${rect.top}px`;
    tooltip.style.left = `${rect.left - tooltipRect.width - 10}px`;
    tooltip.style.opacity = "1";
  }

  function closeTooltip() {
    tooltip.style.opacity = "0";
  }
}

function updateUpgrade(upgrade: PurchasedUpgrade) {
  const upgradeElements = upgradeList.querySelectorAll("li");
  upgradeElements.forEach((elem) => {
    if (elem.dataset.upgradeId !== upgrade.id.toString()) return;
    const costElem = elem.querySelector(".upgrade-cost")!;
    costElem.textContent = formatDollar(upgrade.getCost(), 1000, 3);
    const levelElem = elem.querySelector(".upgrade-level")!;
    if (upgrade.level == 0) return;
    levelElem.textContent = `${upgrade.level ?? 0}`;
  });
}

function updatePassiveIncomeDisplay() {
  let income = 0;
  gameState.upgrades.forEach((upgrade) => {
    if (upgrade.type === UpgradeType.PASSIVE) {
      income += upgrade.getValue({ income: calculatePassiveIncome() });
    }
  });
  incomeDisplay.textContent = formatDollar(income, 1000);
}

function updateUpgradeDisplay() {
  const upgradeElements = upgradeList.querySelectorAll("li");
  upgradeElements.forEach((elem) => {
    const upgradeId = Number(elem.dataset.upgradeId);
    const upgrade = upgradeData.find((u) => u.id === upgradeId)!;
    const purchasedUpgrade = gameState.upgrades.find((u) => u.id === upgradeId);
    const upgradeButton = elem.querySelector(
      ".upgrade-button",
    ) as HTMLButtonElement;
    upgradeButton.disabled =
      gameState.currency < (purchasedUpgrade?.getCost() ?? upgrade.getCost());
  });
}

function updateUpgradeTooltipContent(upgrade: PurchasedUpgrade) {
  const tooltip = document.getElementById("upgrade-tooltip")!;
  const tooltipDescription = tooltip.querySelector(
    ".upgrade-tooltip-description",
  )!;
  const tooltipValue = tooltip.querySelector(".upgrade-tooltip-value")!;
  const tooltipTotalValue = tooltip.querySelector(
    ".upgrade-tooltip-total-value",
  )!;
  const tooltipCost = tooltip.querySelector(".upgrade-tooltip-cost")!;
  const tooltipLevel = tooltip.querySelector(".upgrade-tooltip-level")!;
  tooltipDescription.textContent = upgrade.description;
  tooltipCost.textContent = `Cost: ${
    formatDollar(
      upgrade.getCost(),
      1000,
    )
  }`;
  tooltipLevel.textContent = `Level: ${upgrade.level ?? 0}`;
  const context = {
    income: calculatePassiveIncome(),
    clickPower: calculateClickPower(),
  };
  tooltipValue.textContent = `Value: +${
    upgrade.getValueString({ ...context, levelOverride: 1 })
  }`;
  tooltipTotalValue.textContent = `Total: +${
    upgrade.getValueString({ ...context, levelOverride: upgrade.level ?? 0 })
  }`;
}

function swapUpgradeTabs(tab: "click" | "passive") {
  upgradeList.innerHTML = "";
  const filteredUpgrades = gameState.upgrades.filter((
    u,
  ) => (tab === "click"
    ? u.type === UpgradeType.CLICK
    : u.type === UpgradeType.PASSIVE)
  );
  filteredUpgrades.forEach((upgrade) => {
    upgradeList.appendChild(createUpgradeElement(upgrade));
    updateUpgrade(upgrade);
  });
  updateUpgradeDisplay();
  if (tab === "click") {
    clickerTabButton.disabled = true;
    passiveTabButton.disabled = false;
  } else {
    clickerTabButton.disabled = false;
    passiveTabButton.disabled = true;
  }
}
//#endregion

function calculateClickPower(): number {
  let clickPower = 1;
  const passiveIncome = calculatePassiveIncome();
  for (const upgrade of gameState.upgrades) {
    if (upgrade.type !== UpgradeType.CLICK) continue;
    clickPower += upgrade.getValue({
      income: passiveIncome,
      clickPower,
    });
  }
  return clickPower;
}

function calculatePassiveIncome(): number {
  let income = 0;
  for (const upgrade of gameState.upgrades) {
    if (upgrade.type !== UpgradeType.PASSIVE) continue;
    income += upgrade.getValue({});
  }
  return income;
}

function consumeClicks(clicks: number) {
  gameState.currency += clicks * calculateClickPower();
  if (clicks > 0) {
    clickSound.currentTime = 0;
    clickSound.play();
    console.log("Consumed clicks:", clicks);
  }
}

let displayedCurrency = 0;
const currencyAnimationSpeed = 10;
function updateCurrencyDisplay(renderDelta: number) {
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
  currencyDisplay.title = `$${gameState.currency.toFixed(2)}`;
  currencyDisplay!.textContent = formatDollar(displayedCurrency, 10_000);
}

//#region Game Loops

let lastTick = performance.now();
let clicksThisSecond = 0;
let clicksToRender = 0;

function logicUpdate() {
  const delta = (performance.now() - lastTick) / 1000;
  lastTick = performance.now();
  consumeClicks(pendingClicks);
  clicksThisSecond += pendingClicks;
  clicksToRender = pendingClicks;
  pendingClicks = 0;
  tickUpgrades(delta);
}

let renderDelta: number;
let lastRenderUpdate: number = performance.now();

function enterRenderLoop() {
  renderDelta = performance.now() - lastRenderUpdate;
  lastRenderUpdate = performance.now();
  updateCurrencyDisplay(renderDelta);
  updateUpgradeDisplay();
  drawClickEffects(
    clicksToRender,
    renderDelta,
    canvas.getContext("2d")!,
    calculateClickPower(),
  );
  clicksToRender = 0;
  requestAnimationFrame(enterRenderLoop);
}

// Update performance metrics every second
setInterval(() => {
  const fps = (1000 / renderDelta).toFixed(1);
  const msPerFrame = renderDelta.toFixed(2);
  performanceMetrics!.textContent = `${fps} FPS | ${msPerFrame} ms/frame`;
}, 1000);
setInterval(() => {
  document.title = `NuclearClick - $${gameState.currency.toFixed(2)}`;
}, 2000);

// Update click income display every second based on clicks this second
setInterval(() => {
  clickIncomeDisplay.textContent = `+${
    formatDollar(
      calculateClickPower() * clicksThisSecond,
      1000,
      0,
    )
  }`;
  clicksThisSecond = 0;
}, 1000);

// Start loops
setInterval(logicUpdate, LOGIC_TIME_STEP);
enterRenderLoop();

//#endregion
