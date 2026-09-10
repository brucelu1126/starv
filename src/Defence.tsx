import { useEffect, useRef, useState } from "react";
import { resolutionFee } from "./engine/formulas.ts";
import { values, type SimParams } from "./engine/params.ts";
import type { EpochTrace } from "./engine/simulate.ts";
import type { Copy } from "./i18n.ts";
import { attachOrbit, drawBox, drawTwin, easeOrbit, fitCam, freshOrbit, iso } from "./iso.ts";

const PIVOT: [number, number] = [4.8, 5];

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
  [-1.8, 2.2, 0],
  [10.4, 2.2, 0],
  [-1.8, 9.0, 0],
  [10.4, 9.0, 0],
  [3.4, 3.5, 5.2],
  [6.4, 3.5, 5.2],
  [8.4, 5.0, 1.4],
  [4.8, 8.2, 1.2],
];

const INK = { top: "#2e2822", right: "#1c1814", left: "#24201a", line: "rgba(242,230,222,0.2)" };
const PLUS = "#3ecf8e";
const MINUS = "#ff6b5a";
const GOLD = "#d4b896";
const PAPER = "#f2e6de";

function poly(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], fill: string, stroke = INK.line) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}


export function Defence({ last, params, t }: { last: EpochTrace | null; params: SimParams; t: Copy }) {
  const p = values(params);
  const live = Boolean(last && last.withdrawn > 0);
  const [P, setP] = useState(0.28);
  const shownP = live && last ? last.pressure : P;
  const fee = live && last ? last.resFee : resolutionFee(P, p);
  const book = live && last ? last.withdrawn : DEMO;
  const burn = live && last ? last.feeBurned : book * fee * p.resolutionBurnShare;
  const stay = live && last ? last.toStayers : book * fee * (1 - p.resolutionBurnShare);

  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const bits = useRef<Bit[]>([]);
  const orbit = useRef(freshOrbit());
  const feeRef = useRef(fee);
  const shareRef = useRef(p.resolutionBurnShare);
  const labelRef = useRef({ leavers: t.leavers, stay: t.toStayers, burn: t.feeBurn });
  feeRef.current = fee;
  shareRef.current = p.resolutionBurnShare;
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
      canvas.height = Math.floor(Math.max(160, r.height) * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    const detach = attachOrbit(host, orbit.current);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      pulse += dt;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      easeOrbit(orbit.current, dt);
      const cam = fitCam(WORLD, W, H, 56, orbit.current, PIVOT);
      const f = feeRef.current;
      const sill = 0.35 + f * 3.4;

      acc += dt;
      const rate = 10 + f * 36;
      if (acc > 1 / rate) {
        acc = 0;
        bits.current.push({
          x: -1.4 + Math.random() * 0.3,
          y: 4.2 + Math.random() * 1.6,
          z: 0.3 + Math.random() * 0.2,
          hue: "run",
          u: 0,
        });
      }

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0d1116";
      ctx.fillRect(0, 0, W, H);

      const fl = [iso(-1.6, 2.6, 0, cam), iso(10.2, 2.6, 0, cam), iso(10.2, 8.8, 0, cam), iso(-1.6, 8.8, 0, cam)];
      poly(ctx, fl, "#141210");
      ctx.strokeStyle = "rgba(242,230,222,0.07)";
      for (let i = 0; i <= 11; i++) {
        const a = iso(i * 1.05 - 1.6, 2.6, 0, cam);
        const b = iso(i * 1.05 - 1.6, 8.8, 0, cam);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (let j = 0; j <= 6; j++) {
        const a = iso(-1.6, 2.6 + j, 0, cam);
        const b = iso(10.2, 2.6 + j, 0, cam);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      drawBox(ctx, -1.2, 3.9, 0, 4.4, 2.2, 0.22, cam, "#1a1815", INK.right, INK.left);
      drawTwin(ctx, 3.35, 3.5, 0, 2.92, 2.9, 4.6, cam, INK.top, INK.right, INK.left);
      drawBox(ctx, 4.12, 3.75, 0, 1.38, 2.4, sill, cam, MINUS, "#8a2e28", "#4a1816");
      drawBox(ctx, 4.0, 6.85, 0, 2.1, 1.7, 0.5, cam, GOLD, "#8a6a38", "#2a2416");
      drawBox(ctx, 6.9, 3.85, 0, 2.5, 2.3, 0.7, cam, INK.top, INK.right, INK.left);

      const glow = iso(4.8, 4.9, sill + 0.15, cam);
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,107,90,${0.08 + 0.14 * Math.sin(pulse * 3)})`;
      ctx.arc(glow.x, glow.y, 14 + f * 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "11px 'IBM Plex Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      const L = labelRef.current;
      const left = iso(0.4, 3.6, 1.1, cam);
      const feePt = iso(4.8, 3.4, 4.6, cam);
      const pit = iso(5.0, 8.0, 1.1, cam);
      const right = iso(8.1, 3.6, 1.3, cam);
      ctx.fillStyle = MINUS;
      ctx.fillText(`01  ${L.leavers}`, left.x, left.y);
      ctx.fillStyle = PAPER;
      ctx.fillText(`02  FEE  ${(f * 100).toFixed(1)}%`, feePt.x, feePt.y);
      ctx.fillStyle = GOLD;
      ctx.fillText(`03  ${L.burn}`, pit.x, pit.y);
      ctx.fillStyle = PLUS;
      ctx.fillText(`04  ${L.stay}`, right.x, right.y);

      bits.current = bits.current.filter((b) => {
        b.u += dt * (0.55 + f * 0.9);
        if (b.hue === "run") {
          b.x += dt * (2.4 + f * 0.8);
          if (b.x >= 4.2) b.hue = Math.random() < shareRef.current ? "burn" : "stay";
        } else if (b.hue === "burn") {
          b.x += (4.9 - b.x) * dt * 2.6;
          b.y += dt * 2.2;
          b.z += dt * 0.25;
        } else {
          b.x += dt * 2.8;
          b.y += (4.9 - b.y) * dt * 2;
        }
        const p2 = iso(b.x, b.y, b.z, cam);
        ctx.beginPath();
        ctx.globalAlpha = Math.max(0, 1 - b.u * 0.55);
        ctx.fillStyle = b.hue === "run" ? MINUS : b.hue === "burn" ? GOLD : PLUS;
        ctx.arc(p2.x, p2.y, b.hue === "run" ? 3.2 : 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return b.u < 2.4 && b.x < 12 && b.y < 11;
      });

      const fog = ctx.createLinearGradient(0, 0, 0, H);
      fog.addColorStop(0, "rgba(13,17,22,0.55)");
      fog.addColorStop(0.2, "rgba(13,17,22,0)");
      fog.addColorStop(0.82, "rgba(13,17,22,0)");
      fog.addColorStop(1, "rgba(13,17,22,0.48)");
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

  return (
    <section className="defence door-page">
      <header className="page-head">
        <div>
          <h2>{t.defTitle}</h2>
          <span className="handle">{t.defence}</span>
          <p>{t.defSub}</p>
        </div>
      </header>

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

      <div ref={wrap} className="door-stage">
        <canvas ref={cvs} className="door-canvas" aria-label="priced door" />
      </div>

      <label className="pressure">
        <span>
          {t.dragPressure} · P {(shownP * 100).toFixed(0)}% · fee {(fee * 100).toFixed(2)}%
        </span>
        <input
          type="range"
          min={0}
          max={0.8}
          step={0.01}
          value={shownP}
          disabled={live}
          onChange={(e) => setP(Number(e.target.value))}
        />
      </label>

      <div className="chips">
        {MARKS.map((m) => (
          <button key={m.id} type="button" className={Math.abs(shownP - m.P) < 0.03 ? "on" : ""} disabled={live} onClick={() => setP(m.P)}>
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
