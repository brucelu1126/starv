export type Cam = { s: number; ox: number; oy: number; yaw: number; pitch: number; cx: number; cy: number };
export type Orbit = { yaw: number; pitch: number; tx: number; ty: number };

const IX = 0.86;
const IY = 0.42;
const IZ = 0.92;

export function spin(x: number, y: number, z: number, cam: Cam): [number, number, number] {
  if (!cam.yaw && !cam.pitch) return [x, y, z];
  const dx = x - cam.cx;
  const dy = y - cam.cy;
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  let rx = dx * cy - dy * sy;
  let ry = dx * sy + dy * cy;
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const rz = z * cp - ry * sp;
  ry = z * sp + ry * cp;
  return [rx + cam.cx, ry + cam.cy, rz];
}

const LINE = "rgba(242,230,222,0.22)";

function lift(hex: string, n: number) {
  if (hex[0] !== "#") return hex;
  const x = Number.parseInt(hex.slice(1), 16);
  if (Number.isNaN(x)) return hex;
  const r = Math.min(255, (x >> 16) + n);
  const g = Math.min(255, ((x >> 8) & 255) + n);
  const b = Math.min(255, (x & 255) + n);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function face(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], fill: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  cam: Cam,
  top: string,
  right: string,
  left: string,
) {
  const A = iso(x, y, z + h, cam);
  const B = iso(x + w, y, z + h, cam);
  const C = iso(x + w, y + d, z + h, cam);
  const D = iso(x, y + d, z + h, cam);
  const E = iso(x, y, z, cam);
  const F = iso(x + w, y, z, cam);
  const G = iso(x + w, y + d, z, cam);
  const Hm = iso(x, y + d, z, cam);
  face(ctx, [B, F, G, C], right);
  face(ctx, [A, D, Hm, E], left);
  face(ctx, [A, B, C, D], top);
}

/** Stepped tower. L/R keep the inner face flush (Standard mark). C insets both sides. */
export function drawTower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  cam: Cam,
  top: string,
  right: string,
  left: string,
  side: "C" | "L" | "R" = "C",
) {
  const bands = [
    { z0: 0, zh: 0.12, cut: 0 },
    { z0: 0.12, zh: 0.12, cut: 0.22 },
    { z0: 0.24, zh: 0.52, cut: 0.4 },
    { z0: 0.76, zh: 0.16, cut: 0.58 },
    { z0: 0.92, zh: 0.08, cut: 0.74 },
  ];
  for (const b of bands) {
    const cut = w * b.cut;
    const sx = side === "L" ? x + cut : side === "R" ? x : x + cut / 2;
    const sw = w - cut;
    const sd = d * (1 - b.cut * 0.28);
    const sy = y + (d - sd) / 2;
    const k = (b.cut * 42) | 0;
    drawBox(ctx, sx, sy, z + h * b.z0, sw, sd, h * b.zh, cam, lift(top, k), lift(right, (k * 0.45) | 0), lift(left, (k * 0.55) | 0));
  }
}

export function drawTwin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  cam: Cam,
  top: string,
  right: string,
  left: string,
) {
  const gap = Math.max(0.4, w * 0.16);
  const tw = (w - gap) / 2;
  drawTower(ctx, x, y, z, tw, d, h, cam, top, right, left, "L");
  drawTower(ctx, x + tw + gap, y, z, tw, d, h, cam, top, right, left, "R");
  drawBox(ctx, x + tw * 0.72, y + d * 0.38, z + h * 0.4, tw * 0.56 + gap, d * 0.24, h * 0.05, cam, top, right, left);
}

export function iso(x: number, y: number, z: number, cam: Cam) {
  const [X, Y, Z] = spin(x, y, z, cam);
  return {
    x: cam.ox + (X - Y) * IX * cam.s,
    y: cam.oy + (X + Y) * IY * cam.s - Z * IZ * cam.s,
  };
}

export function fitCam(
  world: [number, number, number][],
  W: number,
  H: number,
  pad = 56,
  orbit: Pick<Orbit, "yaw" | "pitch"> = { yaw: 0, pitch: 0 },
  pivot: [number, number] = [0, 0],
): Cam {
  const cam: Cam = { s: 1, ox: 0, oy: 0, yaw: orbit.yaw, pitch: orbit.pitch, cx: pivot[0], cy: pivot[1] };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of world) {
    const [x, y, z] = spin(p[0], p[1], p[2], cam);
    const px = (x - y) * IX;
    const py = (x + y) * IY - z * IZ;
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  cam.s = Math.min((W - pad * 2) / Math.max(1e-6, maxX - minX), (H - pad * 2) / Math.max(1e-6, maxY - minY));
  cam.ox = (W - (minX + maxX) * cam.s) / 2;
  cam.oy = (H - (minY + maxY) * cam.s) / 2;
  return cam;
}

export function freshOrbit(): Orbit {
  return { yaw: 0, pitch: 0, tx: 0, ty: 0 };
}

/** ~0.4s time constant, capped so a slam still takes a couple of seconds. */
export function easeOrbit(o: Orbit, dt = 1 / 60) {
  const k = 1 - Math.exp(-dt / 0.42);
  const cap = 0.95 * dt;
  let dy = (o.tx - o.yaw) * k;
  let dp = (o.ty - o.pitch) * k;
  if (dy > cap) dy = cap;
  else if (dy < -cap) dy = -cap;
  if (dp > cap) dp = cap;
  else if (dp < -cap) dp = -cap;
  o.yaw += dy;
  o.pitch += dp;
}

/** Pointer X = 360° yaw, Y = a little pitch. Leaves ease back to rest. */
export function attachOrbit(el: HTMLElement, o: Orbit) {
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    o.tx = ((e.clientX - r.left) / r.width - 0.5) * Math.PI * 2;
    o.ty = ((e.clientY - r.top) / r.height - 0.5) * -0.32;
  };
  const leave = () => {
    o.tx = 0;
    o.ty = 0;
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerleave", leave);
  return () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerleave", leave);
  };
}
