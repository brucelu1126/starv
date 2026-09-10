import { useEffect, useRef, type MouseEvent } from "react";
import type { BranchId, EpochTrace } from "./engine/simulate.ts";
import { attachOrbit, drawBox, drawTwin, easeOrbit, fitCam, freshOrbit, iso, type Cam } from "./iso.ts";

const PIVOT: [number, number] = [8, 5.4];

type Kind = "in" | "out" | "gold" | "burn" | "feeburn" | "stay";
type P = { k: Kind; u: number; spd: number };
type Box = { id: BranchId; x: number; y: number; z: number; w: number; d: number; h: number };

const BOXES: Box[] = [
  { id: "vault", x: 1.2, y: 0.55, z: 0, w: 2.6, d: 1.8, h: 4.2 },
  { id: "vault", x: 12.2, y: 0.55, z: 0, w: 2.6, d: 1.8, h: 4.2 },
  { id: "read_Fn", x: 6.0, y: 4.2, z: 0, w: 4.0, d: 2.8, h: 4.6 },
  { id: "m_update", x: 2.2, y: 8.15, z: 0, w: 2.3, d: 1.6, h: 3.4 },
  { id: "exits", x: 11.5, y: 8.0, z: 0, w: 2.4, d: 1.6, h: 3.6 },
];

const FIT: [number, number, number][] = [
  [1.0, 0.4, 0],
  [15.0, 0.4, 0],
  [15.0, 10.6, 0],
  [1.0, 10.6, 0],
  [2.5, 0.6, 4.2],
  [13.5, 0.6, 4.2],
  [8.0, 6.0, 5.0],
];

function boxFaces(b: Box, cam: Cam) {
  const { x, y, z, w, d, h } = b;
  const A = iso(x, y, z + h, cam);
  const B = iso(x + w, y, z + h, cam);
  const C = iso(x + w, y + d, z + h, cam);
  const D = iso(x, y + d, z + h, cam);
  const E = iso(x, y, z, cam);
  const F = iso(x + w, y, z, cam);
  const G = iso(x + w, y + d, z, cam);
  const Hm = iso(x, y + d, z, cam);
  return {
    top: [A, B, C, D],
    right: [B, F, G, C],
    left: [A, D, Hm, E],
    mid: iso(x + w / 2, y + d / 2, z + h + 0.15, cam),
  };
}

const INK = { top: "#2e2822", right: "#1c1814", left: "#24201a", line: "rgba(242,230,222,0.2)" };
const PLUS = "#3ecf8e";
const MINUS = "#ff6b5a";
const GOLD = "#d4b896";
const PAPER = "#f2e6de";

function poly(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], fill: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK.line;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = PAPER) {
  ctx.font = "11px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function lerp(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function along(pts: { x: number; y: number }[], u: number) {
  const t = Math.min(0.999, Math.max(0, u)) * (pts.length - 1);
  const i = Math.floor(t);
  return lerp(pts[i], pts[i + 1], t - i);
}

const COL: Record<Kind, string> = {
  in: PLUS,
  out: MINUS,
  gold: GOLD,
  burn: GOLD,
  feeburn: GOLD,
  stay: PLUS,
};

export function Machine({
  last,
  lit,
  onLit,
  playing,
}: {
  last: EpochTrace | null;
  lit: BranchId | null;
  onLit: (id: BranchId) => void;
  playing: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const bits = useRef<P[]>([]);
  const orbit = useRef(freshOrbit());
  const lastRef = useRef(last);
  const playRef = useRef(playing);
  const litRef = useRef(lit);
  lastRef.current = last;
  playRef.current = playing;
  litRef.current = lit;

  useEffect(() => {
    const canvas = cvs.current;
    const host = wrap.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let acc = 0;
    let prev = performance.now();

    const fit = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(r.width * dpr);
      canvas.height = Math.floor(Math.max(160, r.height) * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    const detach = attachOrbit(host, orbit.current);

    const paths = (cam: Cam) => ({
      in: [iso(-1.2, 5.6, 1.1, cam), iso(6.2, 5.6, 1.4, cam)],
      out: [iso(9.8, 5.6, 1.4, cam), iso(17.2, 5.6, 1.1, cam)],
      gold: [iso(7.8, 5.2, 2.4, cam), iso(4.4, 3.4, 2.2, cam), iso(2.5, 1.7, 2.6, cam)],
      burn: [iso(8.2, 5.2, 2.4, cam), iso(11.6, 3.4, 2.2, cam), iso(13.5, 1.7, 2.6, cam)],
      feeburn: [iso(12.6, 8.6, 2.1, cam), iso(13.0, 4.4, 2.0, cam), iso(13.5, 1.7, 2.6, cam)],
      stay: [iso(12.6, 8.6, 2.1, cam), iso(9.4, 6.4, 1.6, cam), iso(7.8, 5.4, 2.2, cam)],
    });

    const spawn = () => {
      const e = lastRef.current;
      const bag = bits.current;
      const push = (k: Kind, n: number, spd: number) => {
        for (let i = 0; i < n && bag.length < 90; i++) bag.push({ k, u: -Math.random() * 0.2, spd });
      };
      if (!e) {
        push("in", 1, 0.35);
        return;
      }
      push("in", e.ethIn > 2 ? 2 : 1, 0.32 + Math.min(0.4, e.ethIn / 40));
      push("out", e.ethOut > 2 ? 2 : 1, 0.32 + Math.min(0.4, e.ethOut / 40));
      if (e.regime === "expansion" && e.goldDelta > 0) push("gold", 2, 0.28);
      if (e.regime === "contraction" && e.buybackEth > 0) push("burn", 2, 0.3);
      if (e.feeBurned > 0) push("feeburn", 2, 0.26);
      if (e.toStayers > 0) push("stay", 2, 0.26);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      easeOrbit(orbit.current, dt);
      const cam = fitCam(FIT, W, H, 40, orbit.current, PIVOT);
      const e = lastRef.current;
      const regime = e?.regime ?? "expansion";
      const F = e?.F ?? 0;
      const m0 = e?.mBefore ?? 1;
      const m1 = e?.mAfter ?? 1;
      const fee = e?.resFee ?? 0;
      const gold = e?.goldOz ?? 0;

      if (playRef.current) {
        acc += dt;
        if (acc > 0.18) {
          acc = 0;
          spawn();
        }
        bits.current = bits.current.filter((p) => {
          p.u += p.spd * dt;
          return p.u < 1.05;
        });
      }

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0d1116";
      ctx.fillRect(0, 0, W, H);
      const fl = [iso(-1, -0.4, 0, cam), iso(17, -0.4, 0, cam), iso(17, 11.2, 0, cam), iso(-1, 11.2, 0, cam)];
      poly(ctx, fl, "#141210");
      ctx.strokeStyle = "rgba(242,230,222,0.07)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 16; i += 2) {
        const a = iso(i, -0.4, 0, cam);
        const b = iso(i, 11.2, 0, cam);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (let j = 0; j <= 11; j += 2) {
        const a = iso(-1, j, 0, cam);
        const b = iso(17, j, 0, cam);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      const pipe = (x: number, y: number, w: number, d: number, on: boolean, c: string) => {
        const faces = boxFaces({ id: "read_Fn", x, y, z: 0.7, w, d, h: 0.45 }, cam);
        poly(ctx, faces.top, on ? c : INK.top);
        poly(ctx, faces.right, INK.right);
        poly(ctx, faces.left, INK.left);
      };
      pipe(-1.1, 5.2, 7.2, 1.15, F > 0, "#163528");
      pipe(9.9, 5.2, 7.2, 1.15, F <= 0, "#3a1614");

      const paint = (b: Box, top: string, right: string, left: string) => {
        drawTwin(ctx, b.x, b.y, b.z, b.w, b.d, b.h, cam, top, right, left);
        if (litRef.current === b.id) {
          const f = boxFaces(b, cam);
          ctx.strokeStyle = "rgba(242,230,222,0.45)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(f.top[0].x, f.top[0].y);
          f.top.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.closePath();
          ctx.stroke();
        }
        return boxFaces(b, cam).mid;
      };

      const expOn = regime === "expansion";
      const leaving = (e?.withdrawn ?? 0) > 0;
      const skin: [string, string, string][] = [
        [expOn ? GOLD : INK.top, expOn ? "#8a6a38" : INK.right, expOn ? "#2a2416" : INK.left],
        [INK.top, INK.right, INK.left],
        [INK.top, INK.right, INK.left],
        [INK.top, INK.right, INK.left],
        [leaving ? "#3a1818" : INK.top, leaving ? "#241414" : INK.right, INK.left],
      ];
      let hook = { x: 0, y: 0 };
      [...BOXES]
        .map((b, i) => ({ b, i, depth: b.x + b.y }))
        .sort((a, c) => a.depth - c.depth)
        .forEach(({ b, i }) => {
          const mid = paint(b, ...skin[i]);
          if (i === 2) hook = mid;
        });

      const bars = Math.min(6, 1 + Math.floor(gold / 6));
      for (let i = 0; i < bars; i++) {
        drawBox(ctx, 1.65 + i * 0.1, 0.95, 0.28 + i * 0.2, 1.05, 0.55, 0.16, cam, GOLD, "#8a6a38", "#2a2416");
      }

      const routes = paths(cam);
      for (const p of bits.current) {
        if (p.u < 0 || p.u > 1) continue;
        const pt = along(routes[p.k], p.u);
        ctx.beginPath();
        ctx.fillStyle = COL[p.k];
        ctx.globalAlpha = 0.92;
        ctx.arc(pt.x, pt.y, p.k === "gold" || p.k === "burn" || p.k === "feeburn" ? 3.2 : 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      tag(ctx, "01  GOLD", iso(2.5, 0.5, 4.0, cam).x, iso(2.5, 0.5, 4.0, cam).y, GOLD);
      tag(ctx, "02  BURN", iso(13.5, 0.5, 4.0, cam).x, iso(13.5, 0.5, 4.0, cam).y, GOLD);
      tag(ctx, "IN", iso(1.2, 5.4, 1.5, cam).x, iso(1.2, 5.4, 1.5, cam).y, PLUS);
      tag(ctx, "OUT", iso(14.8, 5.4, 1.5, cam).x, iso(14.8, 5.4, 1.5, cam).y, MINUS);
      tag(ctx, m0 !== m1 ? `04  m  ${m0.toFixed(2)}→${m1.toFixed(2)}×` : `04  m  ${m1.toFixed(2)}×`, iso(3.5, 9.5, 3.0, cam).x, iso(3.5, 9.5, 3.0, cam).y);
      tag(ctx, `05  EXIT  ${(fee * 100).toFixed(1)}%`, iso(12.7, 9.5, 3.4, cam).x, iso(12.7, 9.5, 3.4, cam).y, leaving ? MINUS : PAPER);
      tag(ctx, "03  Fₙ", hook.x, hook.y + 16);
      ctx.font = "600 20px 'IBM Plex Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = F > 0 ? PLUS : MINUS;
      ctx.fillText(`${F > 0 ? "+" : ""}${F.toFixed(2)}`, hook.x, hook.y - 2);

      const fog = ctx.createLinearGradient(0, 0, 0, H);
      fog.addColorStop(0, "rgba(13,17,22,0.55)");
      fog.addColorStop(0.22, "rgba(13,17,22,0)");
      fog.addColorStop(0.82, "rgba(13,17,22,0)");
      fog.addColorStop(1, "rgba(13,17,22,0.5)");
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      detach();
    };
  }, []);

  function hit(ev: MouseEvent<HTMLCanvasElement>) {
    const canvas = cvs.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const cam = fitCam(FIT, W, H, 40, orbit.current, PIVOT);
    for (const b of [...BOXES].reverse()) {
      const f = boxFaces(b, cam);
      const xs = f.top.concat(f.left, f.right).map((p) => p.x);
      const ys = f.top.concat(f.left, f.right).map((p) => p.y);
      if (x > Math.min(...xs) && x < Math.max(...xs) && y > Math.min(...ys) && y < Math.max(...ys)) {
        onLit(b.id);
        return;
      }
    }
    onLit("read_Fn");
  }

  return (
    <div ref={wrap} className={`machine hall ${playing ? "is-live" : ""} ${last?.regime ?? "expansion"}`}>
      <canvas ref={cvs} className="machine-3d" role="img" aria-label="Bank machine" onClick={hit} />
    </div>
  );
}
