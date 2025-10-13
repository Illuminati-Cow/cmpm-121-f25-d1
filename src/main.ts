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

const clickSound = new Audio("click.wav");
clickSound.volume = 0.5;
clickSound.load();
document.body.appendChild(clickSound);

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

function enterRenderLoop() {
  renderDelta = performance.now() - lastRenderUpdate;
  lastRenderUpdate = performance.now();
  updateStatsDisplay();
  updateUpgradeDisplay();
  drawClickEffects(
    clicksToRender,
    renderDelta / 1000,
    canvas.getContext("2d")!,
  );
  clicksToRender = 0;
  requestAnimationFrame(enterRenderLoop);
}

const trucks: Array<{ x: number }> = [];
const clickToasts: Array<{ x: number; y: number; alpha: number }> = [];
const clickParticles: Array<
  { x: number; y: number; vx: number; vy: number; alpha: number }
> = [];

function drawClickEffects(
  clicks: number,
  delta: number,
  ctx: CanvasRenderingContext2D,
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawClickToasts(clicks, delta, ctx);
  drawClickParticles(clicks, delta, ctx);
  drawTrucks(clicks, delta, ctx);
}

//#region Pre-render the toast text on an offscreen canvas
let toastText = "+$" + calculateClickValue().toFixed(2);
const toastFont = "20px Arial";
const toastCanvas = new OffscreenCanvas(0, 0);
const toastCtx = toastCanvas.getContext("2d")!;
toastCtx.font = toastFont;
function prerenderToastText() {
  toastCtx.clearRect(0, 0, toastCanvas.width, toastCanvas.height);
  toastText = "+$" + calculateClickValue().toFixed(2);
  const textMetrics = toastCtx.measureText(toastText);
  toastCanvas.width = textMetrics.width + 10;
  toastCanvas.height = 30;
  toastCtx.font = toastFont;
  toastCtx.fillStyle = "black";
  toastCtx.fillText(toastText, 5, 22);
}
prerenderToastText();
//#endregion

function drawClickToasts(
  clicks: number,
  delta: number,
  ctx: CanvasRenderingContext2D,
) {
  const pos = getCanvasPosition(mainClicker);
  const offsetY = mainClicker.getBoundingClientRect().height / 2 + 20;
  const toastsPerClick = 1;
  const maxToastsPerFrame = 5;
  const totalToasts = Math.min(clicks * toastsPerClick, maxToastsPerFrame);
  for (let i = 0; i < totalToasts; i++) {
    clickToasts.push({
      x: pos.x + (Math.random() - 0.5) * 20,
      y: pos.y - offsetY,
      alpha: 1,
    });
  }

  ctx.save();
  clickToasts.forEach((toast) => {
    toast.y -= 200 * delta;
    toast.alpha -= 3 * delta;
    ctx.globalAlpha = Math.max(0, toast.alpha);
    ctx.drawImage(
      toastCanvas,
      toast.x - toastCanvas.width / 2,
      toast.y - toastCanvas.height / 2,
    );
  });
  ctx.restore();

  // Remove toasts that are no longer visible
  for (let i = clickToasts.length - 1; i >= 0; i--) {
    if (clickToasts[i].alpha <= 0) {
      clickToasts.splice(i, 1);
    }
  }
}

function drawClickParticles(
  clicks: number,
  delta: number,
  ctx: CanvasRenderingContext2D,
) {
  const pos = getCanvasPosition(mainClicker);
  const particlesPerClick = 5;
  const maxParticlesPerFrame = 20;
  const totalParticles = Math.min(
    clicks * particlesPerClick,
    maxParticlesPerFrame,
  );
  for (let i = 0; i < totalParticles; i++) {
    const sign = Math.sign(Math.random() - 0.5);
    clickParticles.push({
      x: pos.x,
      y: pos.y,
      vx: sign * (50 + 200 * Math.random()),
      vy: -300 * Math.random(),
      alpha: 1.75,
    });
  }

  clickParticles.forEach((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 400 * delta; // Gravity
    particle.alpha -= 2 * delta;

    ctx.fillStyle = `rgba(89, 255, 0, ${particle.alpha})`;
    ctx.fillRect(particle.x - 10, particle.y - 20, 20, 20);
  });

  // Remove particles that are no longer visible
  for (let i = clickParticles.length - 1; i >= 0; i--) {
    if (clickParticles[i].alpha <= 0) {
      clickParticles.splice(i, 1);
    }
  }
}

//#region Pre-render the truck emoji on an offscreen canvas
const truckFont = "40px serif";
const truckCanvas = new OffscreenCanvas(0, 0);
const truckCtx = truckCanvas.getContext("2d")!;
truckCtx.font = truckFont;
const truckText = "🚚";
const truckMetrics = truckCtx.measureText(truckText);
truckCanvas.width = truckMetrics.width + 20;
truckCanvas.height = 50;
truckCtx.font = truckFont;
truckCtx.fillStyle = "black";
truckCtx.fillText(truckText, 10, 40);
//#endregion

function drawTrucks(
  truckCount: number,
  delta: number,
  ctx: CanvasRenderingContext2D,
) {
  const spawnPos = getCanvasPosition(mainClicker);
  spawnPos.x += 50;
  for (let i = 0; i < truckCount; i++) {
    trucks.push({ x: spawnPos.x - truckCanvas.width / 2 });
  }

  ctx.save();
  ctx.scale(-1, 1);
  ctx.globalAlpha = 1;
  trucks.forEach((truck) => {
    truck.x += 300 * delta;
    ctx.drawImage(
      truckCanvas,
      -truck.x - truckCanvas.width / 2,
      spawnPos.y - truckCanvas.height / 2,
    );
  });
  ctx.restore();

  // Remove trucks that have moved offscreen
  for (let i = trucks.length - 1; i >= 0; i--) {
    if (trucks[i].x > canvas.width + truckCanvas.width) {
      trucks.splice(i, 1);
    }
  }
}

function getCanvasPosition(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  // Convert element center position from screen to canvas coordinates
  const x = (rect.left + rect.width / 2) - canvasRect.left;
  const y = (rect.top + rect.height / 2) -
    canvasRect.top;
  return { x, y };
}

function consumeClicks(clicks: number) {
  gameState.currency += clicks * calculateClickValue();
  clicks > 0 && clickSound.play();
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
        levelElem.textContent = `${purchasedUpgrade.level}`;
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
    prerenderToastText();
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
