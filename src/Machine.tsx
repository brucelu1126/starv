import { useEffect, useRef, type MouseEvent } from "react";
import type { BranchId, EpochTrace } from "./engine/simulate.ts";
import { attachOrbit, easeOrbit, fitCam, freshOrbit, iso, type Cam } from "./iso.ts";

const PIVOT: [number, number] = [8, 5.4];

type Kind = "in" | "out" | "gold" | "burn" | "stay";
type P = { k: Kind; u: number; spd: number };
type Box = { id: BranchId; x: number; y: number; z: number; w: number; d: number; h: number };

const BOXES: Box[] = [
  { id: "vault", x: 1.2, y: 0.6, z: 0, w: 2.6, d: 2.2, h: 2.4 },
  { id: "vault", x: 12.2, y: 0.6, z: 0, w: 2.6, d: 2.2, h: 2.4 },
  { id: "read_Fn", x: 6.2, y: 4.4, z: 0, w: 3.6, d: 3.2, h: 3.2 },
  { id: "m_update", x: 2.4, y: 8.2, z: 0, w: 2.2, d: 2.2, h: 1.6 },
  { id: "exits", x: 11.4, y: 8.0, z: 0, w: 2.6, d: 2.4, h: 2.0 },
];

const WORLD: [number, number, number][] = [
  [-1.2, -0.4, 0],
  [17.2, -0.4, 0],
  [17.2, 11.4, 0],
  [-1.2, 11.4, 0],
  [2.5, -0.4, 5.0],
  [13.5, -0.4, 5.0],
  [8.0, 6.0, 5.2],
  [3.5, 10.6, 2.8],
  [12.7, 10.6, 3.0],
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

function poly(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], fill: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.stroke();
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
  in: "#3ecf8e",
  out: "#e35d4a",
  gold: "#e6c36a",
  burn: "#ff7a5c",
  stay: "#7ee0b0",
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
      canvas.height = Math.floor(Math.max(420, r.width * 0.52) * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${canvas.height / dpr}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    const detach = attachOrbit(canvas, orbit.current);

    const paths = (cam: Cam) => ({
      in: [iso(-1.2, 5.6, 1.1, cam), iso(6.2, 5.6, 1.4, cam)],
      out: [iso(9.8, 5.6, 1.4, cam), iso(17.2, 5.6, 1.1, cam)],
      gold: [iso(7.8, 5.2, 2.4, cam), iso(4.4, 3.4, 2.2, cam), iso(2.5, 1.7, 2.6, cam)],
      burn: [iso(8.2, 5.2, 2.4, cam), iso(11.6, 3.4, 2.2, cam), iso(13.5, 1.7, 2.6, cam)],
      stay: [iso(12.6, 8.6, 2.1, cam), iso(8.0, 8.4, 1.4, cam), iso(3.5, 9.0, 1.8, cam)],
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
      if (e.regime === "contraction") push("burn", 2, 0.3);
      if (e.toStayers > 0) push("stay", 2, 0.26);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      easeOrbit(orbit.current);
      const cam = fitCam(WORLD, W, H, 56, orbit.current, PIVOT);
      const e = lastRef.current;
      const regime = e?.regime ?? "expansion";
      const F = e?.F ?? 0;
      const m = e?.mAfter ?? 1;
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
      // floor
      ctx.fillStyle = "#0d1116";
      const fl = [iso(-1, -0.4, 0, cam), iso(17, -0.4, 0, cam), iso(17, 11.2, 0, cam), iso(-1, 11.2, 0, cam)];
      poly(ctx, fl, "#121820");
      ctx.strokeStyle = "rgba(58,68,82,0.45)";
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

      // pipes as flat slabs
      const pipe = (x: number, y: number, w: number, d: number, on: boolean, c: string) => {
        const faces = boxFaces({ id: "read_Fn", x, y, z: 0.7, w, d, h: 0.55 }, cam);
        poly(ctx, faces.top, on ? c : "#1a2028");
        poly(ctx, faces.right, "#0e1218");
        poly(ctx, faces.left, "#151b22");
      };
      pipe(-1.1, 5.2, 7.2, 1.15, F >= 0, "#163528");
      pipe(9.9, 5.2, 7.2, 1.15, F < 0, "#3a1614");

      const paint = (b: Box, top: string, right: string, left: string, on: boolean) => {
        const f = boxFaces(b, cam);
        poly(ctx, f.top, on ? top : "#1c222b");
        poly(ctx, f.right, on ? right : "#12161c");
        poly(ctx, f.left, on ? left : "#161b22");
        if (on || litRef.current === b.id) {
          ctx.strokeStyle = "#d4b483";
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
        return f.mid;
      };

      const expOn = regime === "expansion";
      const conOn = regime === "contraction";
      const skin: Record<number, [string, string, string, boolean]> = {
        0: [expOn ? "#e6c36a" : "#3a3018", "#8a6a28", "#2a2416", expOn],
        1: [conOn ? "#e35d4a" : "#3a1818", "#7a2a22", "#241414", conOn],
        2: ["#2a2418", "#9a7840", "#1c1810", true],
        3: ["#d4b483", "#6a5430", "#2a2418", litRef.current === "m_update"],
        4: ["#3a4452", "#2a3140", "#12161c", (e?.withdrawn ?? 0) > 0],
      };
      let hook = { x: 0, y: 0 };
      [...BOXES]
        .map((b, i) => ({ b, i, depth: b.x + b.y }))
        .sort((a, c) => a.depth - c.depth)
        .forEach(({ b, i }) => {
          const mid = paint(b, ...skin[i]);
          if (i === 2) hook = mid;
        });

      // gold bars
      const bars = Math.min(6, 1 + Math.floor(gold / 6));
      for (let i = 0; i < bars; i++) {
        const f = boxFaces({ id: "vault", x: 1.5 + i * 0.28, y: 1.0, z: 0.2 + i * 0.22, w: 1.4, d: 0.7, h: 0.18 }, cam);
        poly(ctx, f.top, "#ffe39a");
        poly(ctx, f.right, "#c4922e");
      }

      const routes = paths(cam);
      for (const p of bits.current) {
        if (p.u < 0 || p.u > 1) continue;
        const pt = along(routes[p.k], p.u);
        ctx.beginPath();
        ctx.fillStyle = COL[p.k];
        ctx.globalAlpha = 0.95;
        ctx.arc(pt.x, pt.y, p.k === "gold" ? 3.4 : 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.textAlign = "center";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "#e6c36a";
      ctx.fillText("EXPANSION", iso(2.5, 0.4, 2.8, cam).x, iso(2.5, 0.4, 2.8, cam).y);
      ctx.fillStyle = "#e35d4a";
      ctx.fillText("CONTRACTION", iso(13.5, 0.4, 2.8, cam).x, iso(13.5, 0.4, 2.8, cam).y);
      ctx.fillStyle = "#3ecf8e";
      ctx.fillText("ETH IN", iso(1.2, 5.4, 1.6, cam).x, iso(1.2, 5.4, 1.6, cam).y);
      ctx.fillStyle = "#e35d4a";
      ctx.fillText("ETH OUT", iso(14.8, 5.4, 1.6, cam).x, iso(14.8, 5.4, 1.6, cam).y);
      ctx.fillStyle = "#8a93a0";
      ctx.fillText("RATCHET", iso(3.5, 9.6, 2.0, cam).x, iso(3.5, 9.6, 2.0, cam).y + 14);
      ctx.fillText(`EXIT ${(fee * 100).toFixed(1)}%`, iso(12.7, 9.6, 2.3, cam).x, iso(12.7, 9.6, 2.3, cam).y + 14);

      ctx.fillStyle = "#f0d7a4";
      ctx.font = "13px 'IBM Plex Mono', monospace";
      ctx.fillText(`${m.toFixed(2)}×`, iso(3.5, 9.3, 1.9, cam).x, iso(3.5, 9.3, 1.9, cam).y);
      ctx.font = "600 22px 'Instrument Serif', serif";
      ctx.fillStyle = F >= 0 ? "#3ecf8e" : "#e35d4a";
      ctx.fillText(`${F >= 0 ? "+" : ""}${F.toFixed(2)}`, hook.x, hook.y - 4);
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "#8a93a0";
      ctx.fillText("HOOK  Fₙ ETH", hook.x, hook.y + 14);
      ctx.fillStyle = regime === "expansion" ? "#3ecf8e" : "#e35d4a";
      ctx.fillText(regime.toUpperCase(), hook.x, hook.y - 26);

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
    const cam = fitCam(WORLD, W, H, 56, orbit.current, PIVOT);
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
    <div
      ref={wrap}
      className={`machine hall ${playing ? "is-live" : ""} ${last?.regime ?? "expansion"}`}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        orbit.current.tx = ((e.clientX - r.left) / r.width - 0.5) * Math.PI * 2;
        orbit.current.ty = ((e.clientY - r.top) / r.height - 0.5) * -0.45;
      }}
      onPointerLeave={() => {
        orbit.current.tx = 0;
        orbit.current.ty = 0;
      }}
    >
      <canvas ref={cvs} className="machine-3d" role="img" aria-label="Bank machine" onClick={hit} />
    </div>
  );
}
