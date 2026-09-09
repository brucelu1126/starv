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
