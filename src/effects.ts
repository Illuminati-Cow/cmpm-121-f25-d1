const mainClicker = document.getElementById("main-clicker")!;
const trucks: Array<{ x: number }> = [];
const clickToasts: Array<{ x: number; y: number; alpha: number }> = [];
const clickParticles: Array<
  { x: number; y: number; vx: number; vy: number; alpha: number }
> = [];
let cachedClickValue = 1.0;

export function drawClickEffects(
  clicks: number,
  delta: number,
  ctx: CanvasRenderingContext2D,
  clickValue: number,
) {
  delta = delta / 1000; // Convert to seconds
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawTrucks(clicks, delta, ctx);
  drawClickParticles(clicks, delta, ctx);
  drawClickToasts(clicks, delta, ctx);
  if (cachedClickValue !== clickValue) {
    cachedClickValue = clickValue;
    prerenderToastText();
  }
}

//#region Pre-render the toast text on an offscreen canvas
let toastText = "+$" + cachedClickValue.toFixed(2);
const toastFont = "20px Arial";
const toastCanvas = new OffscreenCanvas(0, 0);
const toastCtx = toastCanvas.getContext("2d")!;
toastCtx.font = toastFont;
function prerenderToastText() {
  toastCtx.clearRect(0, 0, toastCanvas.width, toastCanvas.height);
  toastText = "+$" + cachedClickValue.toFixed(2);
  const textMetrics = toastCtx.measureText(toastText);
  toastCanvas.width = textMetrics.width + 10;
  toastCanvas.height = 30;
  toastCtx.font = toastFont;
  toastCtx.fillStyle = "black";
  toastCtx.fillText(toastText, 5, 22);
}
prerenderToastText();
//#endregion

export function drawClickToasts(
  clicks: number,
  delta: number,
  ctx: CanvasRenderingContext2D,
) {
  const pos = getCanvasPosition(mainClicker, ctx.canvas);
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

export function drawClickParticles(
  clicks: number,
  delta: number,
  ctx: CanvasRenderingContext2D,
) {
  const pos = getCanvasPosition(mainClicker, ctx.canvas);
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

export function drawTrucks(
  truckCount: number,
  delta: number,
  ctx: CanvasRenderingContext2D,
) {
  const spawnPos = getCanvasPosition(mainClicker, ctx.canvas);
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
    if (trucks[i].x > ctx.canvas.width + truckCanvas.width) {
      trucks.splice(i, 1);
    }
  }
}

function getCanvasPosition(element: HTMLElement, canvas: HTMLCanvasElement) {
  const rect = element.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  // Convert element center position from screen to canvas coordinates
  const x = (rect.left + rect.width / 2) - canvasRect.left;
  const y = (rect.top + rect.height / 2) -
    canvasRect.top;
  return { x, y };
}
