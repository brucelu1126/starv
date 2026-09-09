import { useEffect, useRef, useState } from "react";
import { resolutionFee } from "./engine/formulas.ts";
import { values, type SimParams } from "./engine/params.ts";
import type { EpochTrace } from "./engine/simulate.ts";
import type { Copy } from "./i18n.ts";
import { attachOrbit, easeOrbit, fitCam, freshOrbit, iso, type Cam } from "./iso.ts";

const PIVOT: [number, number] = [4.2, 5];

type Hue = "run" | "burn" | "stay";
type Bit = { x: number; y: number; z: number; hue: Hue; u: number };

const MARKS = [
  { id: "quiet" as const, P: 0.04 },
  { id: "elevated" as const, P: 0.15 },
  { id: "heavy" as const, P: 0.3 },
  { id: "bankrun" as const, P: 0.55 },
];

const DEMO = 1_000_000;

const WORLD: [number, number, number][] = [
  [-2.2, 1.0, 0],
  [10.2, 1.0, 0],
  [-2.2, 9.4, 0],
  [10.2, 9.4, 0],
  [3.9, 3.6, 8.2],
  [5.5, 5.4, 8.2],
  [0.0, 4.0, 4.4],
  [8.2, 4.4, 3.6],
  [4.7, 8.0, 2.2],
];

function poly(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], fill: string, stroke = "rgba(0,0,0,0.35)") {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function block(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, w: number, d: number, h: number, cam: Cam, top: string, right: string, left: string) {
  const A = iso(x, y, z + h, cam);
  const B = iso(x + w, y, z + h, cam);
  const C = iso(x + w, y + d, z + h, cam);
  const D = iso(x, y + d, z + h, cam);
  const E = iso(x, y, z, cam);
  const F = iso(x + w, y, z, cam);
  const G = iso(x + w, y + d, z, cam);
  const Hm = iso(x, y + d, z, cam);
  poly(ctx, [B, F, G, C], right);
  poly(ctx, [A, D, Hm, E], left);
  poly(ctx, [A, B, C, D], top);
}

export function Defence({ last, params, t }: { last: EpochTrace | null; params: SimParams; t: Copy }) {
  const p = values(params);
  const live = Boolean(last && last.withdrawn > 0);
  const [P, setP] = useState(0.28);
  const fee = live && last ? last.resFee : resolutionFee(P, p);
  const book = live && last ? last.withdrawn : DEMO;
  const burn = live && last ? last.feeBurned : book * fee * p.resolutionBurnShare;
  const stay = live && last ? last.toStayers : book * fee * (1 - p.resolutionBurnShare);

  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const bits = useRef<Bit[]>([]);
  const orbit = useRef(freshOrbit());
  const feeRef = useRef(fee);
  const labelRef = useRef({ leavers: t.leavers, stay: t.toStayers, burn: t.feeBurn });
  feeRef.current = fee;
  labelRef.current = { leavers: t.leavers, stay: t.toStayers, burn: t.feeBurn };

  useEffect(() => {
    if (last && last.withdrawn > 0) setP(last.pressure);
  }, [last?.n, last?.pressure, last?.withdrawn]);

  useEffect(() => {
    const canvas = cvs.current;
    const host = wrap.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let acc = 0;
    let prev = performance.now();
    let pulse = 0;

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

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      pulse += dt;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      easeOrbit(orbit.current);
      const cam = fitCam(WORLD, W, H, 72, orbit.current, PIVOT);
      const f = feeRef.current;
      const doorH = 1.4 + f * 4.2;

      acc += dt;
      const rate = 10 + f * 36;
      if (acc > 1 / rate) {
        acc = 0;
        bits.current.push({
          x: -1.2 + Math.random() * 0.4,
          y: 3.6 + Math.random() * 1.4,
          z: 0.35 + Math.random() * 0.25,
          hue: "run",
          u: 0,
        });
      }

      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#3a2218");
      sky.addColorStop(0.45, "#1c100e");
      sky.addColorStop(1, "#0a0606");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i <= 10; i++) {
        const a = iso(i * 1.2 - 2, 1.2, 0, cam);
        const b = iso(i * 1.2 - 2, 9.2, 0, cam);
        ctx.strokeStyle = "rgba(230,180,120,0.08)";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (let j = 0; j <= 8; j++) {
        const a = iso(-2, 1.2 + j, 0, cam);
        const b = iso(10, 1.2 + j, 0, cam);
        ctx.strokeStyle = "rgba(230,180,120,0.08)";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      block(ctx, 6.6, 3.2, 0, 2.8, 2.6, 1.8, cam, "#24352c", "#1a2820", "#15211b");
      block(ctx, 3.6, 6.4, 0, 2.2, 2.0, 0.7, cam, "#3a2a12", "#2a1c0c", "#1e140a");
      block(ctx, 3.9, 3.6, 0, 1.6, 1.8, doorH, cam, `rgba(227,93,74,${0.35 + f * 0.45})`, "#8a3028", "#5a201c");

      const glow = iso(4.7, 4.5, doorH + 0.2, cam);
      ctx.beginPath();
      ctx.fillStyle = `rgba(227,93,74,${0.12 + 0.18 * Math.sin(pulse * 4)})`;
      ctx.arc(glow.x, glow.y, 18 + f * 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "12px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      const L = labelRef.current;
      const left = iso(0.2, 4.2, 2.2, cam);
      const right = iso(8.0, 4.4, 2.4, cam);
      const pit = iso(4.7, 7.4, 1.4, cam);
      const feePt = iso(4.7, 4.5, doorH + 0.8, cam);
      ctx.fillStyle = "#e35d4a";
      ctx.fillText(L.leavers, left.x, left.y);
      ctx.fillStyle = "#3ecf8e";
      ctx.fillText(L.stay, right.x, right.y);
      ctx.fillStyle = "#e6c36a";
      ctx.fillText(L.burn, pit.x, pit.y);
      ctx.fillStyle = "#efe6d2";
      ctx.fillText(`${(f * 100).toFixed(1)}%`, feePt.x, feePt.y);

      bits.current = bits.current.filter((b) => {
        b.u += dt * (0.55 + f * 0.9);
        if (b.hue === "run") {
          b.x += dt * (2.8 + f * 1.4);
          if (b.x >= 3.7) {
            b.hue = Math.random() < 0.5 ? "burn" : "stay";
          }
        } else if (b.hue === "burn") {
          b.x += (4.5 - b.x) * dt * 3;
          b.y += dt * 2.4;
          b.z += dt * 0.4;
        } else {
          b.x += dt * 3.2;
          b.y += (4.4 - b.y) * dt * 2;
        }
        const p2 = iso(b.x, b.y, b.z, cam);
        ctx.beginPath();
        ctx.globalAlpha = Math.max(0, 1 - b.u * 0.55);
        ctx.fillStyle = b.hue === "run" ? "#e35d4a" : b.hue === "burn" ? "#e6c36a" : "#3ecf8e";
        ctx.arc(p2.x, p2.y, b.hue === "run" ? 3.4 : 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return b.u < 2.4 && b.x < 12 && b.y < 11;
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      detach();
    };
  }, []);

  return (
    <section className="defence door-page">
      <header>
        <h2>{t.defTitle}</h2>
        <p>{t.defSub}</p>
      </header>

      <div
        ref={wrap}
        className="door-stage"
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
        <canvas ref={cvs} className="door-canvas" aria-label="priced door" />
      </div>

      <div className="door-read">
        <div className="door-num leave">
          <b>{book.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b>
          <span>{live ? "W" : t.demoBook}</span>
        </div>
        <div className="door-num burn" key={`b-${burn.toFixed(0)}`}>
          <b>{burn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b>
          <span>{t.feeBurn}</span>
        </div>
        <div className="door-num stay" key={`s-${stay.toFixed(0)}`}>
          <b>{stay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b>
          <span>{t.toStayers}</span>
        </div>
      </div>

      <label className="pressure">
        <span>
          {t.dragPressure} · P {(P * 100).toFixed(0)}% · fee {(fee * 100).toFixed(2)}%
        </span>
        <input
          type="range"
          min={0}
          max={0.8}
          step={0.01}
          value={P}
          disabled={live}
          onChange={(e) => setP(Number(e.target.value))}
        />
      </label>

      <div className="chips">
        {MARKS.map((m) => (
          <button key={m.id} type="button" className={Math.abs(P - m.P) < 0.03 ? "on" : ""} onClick={() => setP(m.P)}>
            {t[m.id]} {(m.P * 100).toFixed(0)}%
          </button>
        ))}
      </div>

      {last && last.withdrawn > 0 ? (
        <p className="muted">
          E{last.n} W = {last.withdrawn.toFixed(0)} · P₇ = {last.pressure.toFixed(3)} · fee = {(last.resFee * 100).toFixed(2)}%
        </p>
      ) : null}

      <p className="formula-line">
        {t.neverPause}
        <code> fee = floor + (ceil−floor) × min(1, P/Psat)² · ½ burn ½ stay</code>
      </p>
    </section>
  );
}
