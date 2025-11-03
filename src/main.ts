import { drawClickEffects } from "./effects.ts";
import "./style.css";
import {
  PurchasedUpgrade,
  Upgrade,
  upgradeData,
  UpgradeType,
} from "./upgrades.ts";

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
  clickPower: number;
  lastPassiveIncome: number;
};

interface UpgradePurchasedEventDetail {
  upgrade: PurchasedUpgrade;
}

//#endregion

const clickSound = new Audio("click.wav");
clickSound.volume = 0.5;
clickSound.load();
document.body.appendChild(clickSound);

//#region DOM Elements
const mainClicker = document.getElementById(
  "main-clicker",
) as HTMLButtonElement;
mainClicker.addEventListener("click", () => pendingClicks++);
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
  clickPower: 1,
  upgrades: [],
  lastPassiveIncome: 0,
};
let pendingClicks = 0;

upgradeList.innerHTML = "";
upgradeData.forEach((upgrade) => {
  upgradeList.appendChild(createUpgradeElement(upgrade));
});
//#endregion

//#region Upgrade System
document.addEventListener("upgrade-purchased", (e) => {
  const detail = (e as CustomEvent<UpgradePurchasedEventDetail>).detail;
  updateUpgradeCost(detail.upgrade.id);
  switch (detail.upgrade.type) {
    case UpgradeType.PASSIVE:
      updatePassiveIncomeDisplay();
      break;
    case UpgradeType.CLICK:
      gameState.clickPower += detail.upgrade.baseValue;
      clickPowerDisplay.textContent = formatDollar(gameState.clickPower, 1000);
      break;
  }
});

function tickUpgrades(delta: number) {
  gameState.upgrades.filter((u) => u.type === UpgradeType.PASSIVE)
    .forEach(
      (upgrade) =>
        gameState.currency += upgrade.getValue({
          income: gameState.lastPassiveIncome,
        }) * delta,
    );
}

function purchaseUpgrade(upgradeId: number) {
  const upgrade = upgradeData.find((u) => u.id === upgradeId);
  if (!upgrade) return;
  const purchasedUpgrade = gameState.upgrades.find((u) => u.id === upgradeId) ??
    { ...upgrade, level: 0 };
  if (gameState.currency < purchasedUpgrade.getCost()) return;

  if (purchasedUpgrade.level === 0) {
    gameState.upgrades.push(purchasedUpgrade);
  }

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

function updateUpgradeCost(upgradeId: number) {
  let upgrade = upgradeData.find((u) => u.id === upgradeId);
  if (!upgrade) return;
  upgrade = gameState.upgrades.find((u) => u.id === upgradeId) ?? upgrade;
  const upgradeElements = upgradeList.querySelectorAll("li");
  upgradeElements.forEach((elem) => {
    const costElem = elem.querySelector(".upgrade-cost");
    if (costElem && elem.dataset.upgradeId === upgradeId.toString()) {
      costElem.textContent = formatDollar(upgrade.getCost(), 1000, 3);
    }
  });
}

function updatePassiveIncomeDisplay() {
  let income = 0;
  gameState.upgrades.forEach((upgrade) => {
    if (upgrade.type === UpgradeType.PASSIVE) {
      income += upgrade.level * upgrade.baseValue;
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
    const levelElem = elem.querySelector(".upgrade-level") as HTMLElement;

    if (purchasedUpgrade) {
      elem.classList.add("purchased");
      if (levelElem) {
        levelElem.textContent = `${purchasedUpgrade.level}`;
      }
    } else {
      elem.classList.remove("purchased");
      if (levelElem) {
        levelElem.textContent = "";
      }
    }

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
  const suffix = upgrade.type === UpgradeType.CLICK ? "c" : "s";
  tooltipLevel.textContent = `Level: ${upgrade.level}`;
  tooltipValue.textContent = `Value: +${
    formatDollar(upgrade.baseValue, 1000)
  }/${suffix}`;
  const totalValue =
    (gameState.upgrades.find((u) => u.id === upgrade.id)?.level || 0) *
    upgrade.baseValue;
  tooltipTotalValue.textContent = `Total Value: +${
    formatDollar(totalValue, 1000)
  }/${suffix}`;
}

//#endregion

function calculateClickValue(): number {
  return gameState.clickPower;
}

function consumeClicks(clicks: number) {
  gameState.currency += clicks * calculateClickValue();
  clicks > 0 && clickSound.play();
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

function formatDollar(
  num: number,
  threshold: number,
  decimals: number = 2,
): string {
  const suffixes = [
    "",
    "k",
    "M",
    "B",
    "T",
    "Q",
    "Qi",
    "Sx",
    "Sp",
    "Oc",
    "No",
    "Dc",
  ];
  if (num < threshold) {
    return `$${num.toFixed(2)}`;
  }
  let suffixIndex = 0;
  const sign = Math.sign(num);
  num = Math.abs(num);
  while (num >= 1000 && suffixIndex < suffixes.length - 1) {
    num /= 1000;
    suffixIndex++;
  }
  return `$${sign < 0 ? "-" : ""}${
    num.toFixed(Math.min(Math.max(suffixIndex, 2), decimals)).replace(
      /\.0$/,
      "",
    )
  }${suffixes[suffixIndex]}`;
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
    calculateClickValue(),
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
    calculateClickValue() * clicksThisSecond
  }`;
  clicksThisSecond = 0;
}, 1000);

// Start loops
setInterval(logicUpdate, LOGIC_TIME_STEP);
enterRenderLoop();

//#endregion
