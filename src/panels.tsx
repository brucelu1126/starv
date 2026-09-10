import type { Copy, Lang } from "./i18n.ts";
import { SPEC } from "./engine/spec.ts";
import { type SimParams } from "./engine/params.ts";
import type { BranchId, EpochTrace } from "./engine/simulate.ts";

export function StateStrip({
  last,
  lit,
  onLit,
}: {
  last: EpochTrace | null;
  lit: BranchId | null;
  onLit: (id: BranchId) => void;
}) {
  const steps: { id: BranchId; label: string }[] = [
    { id: "read_Fn", label: "Fₙ" },
    { id: "regime", label: "regime" },
    { id: "signal", label: "signal" },
    { id: "m_update", label: "m" },
    { id: "issue", label: "Iₙ" },
    { id: "fee_split", label: "70/15/15" },
    { id: "vault", label: "vault" },
    { id: "exits", label: "exit" },
  ];
  return (
    <ol className="strip">
      {steps.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            className={`strip-btn ${lit === s.id ? "on" : ""} ${last && highlight(s.id, last) ? "hit" : ""}`}
            onClick={() => onLit(s.id)}
          >
            {s.label}
          </button>
        </li>
      ))}
    </ol>
  );
}

function highlight(id: BranchId, last: EpochTrace) {
  if (id === "regime") return true;
  if (id === "m_update") return last.mBranch !== "hold";
  if (id === "vault") return last.goldDelta > 0 || last.buybackEth > 0;
  if (id === "exits") return last.withdrawn > 0;
  return last.F !== 0;
}

const FORMULA: Record<BranchId, string> = {
  read_Fn: "F_n = ETH_in − ETH_out",
  regime: "expansion iff F_n > 0   ·   F=0 is contraction",
  signal: "signal_n = F_{n-1} + F_{n-2}",
  m_update: "signal>0 → m += step   ·   signal≤0 → cut now",
  issue: "I_n = base × d × m_n",
  fee_split: "protocol ETH × 70 / 15 / 15",
  vault: "exp: buy gold, never sell   ·   con: min(0.10V, 0.002R)",
  exits: "P = W/max(D+W,ε)   ·   fee = floor+(ceil−floor)×min(1,P/Psat)²",
};

export function WhyCard({ last, lit, t }: { last: EpochTrace | null; lit: BranchId | null; t: Copy }) {
  if (!last) return <p className="muted">{t.hoverHint}</p>;
  const id = lit ?? "read_Fn";
  return (
    <div className="why">
      <div className="why-kicker">{t.why}</div>
      <code className="why-formula">{FORMULA[id]}</code>
      <p>{last.why[id]}</p>
    </div>
  );
}

export function Identities() {
  return (
    <ul className="identities">
      <li>
        <code>F_n = ETH_in − ETH_out</code>
        <span>§4.1</span>
      </li>
      <li>
        <code>raise earned · cut immediate</code>
        <span>§5</span>
      </li>
      <li>
        <code>fee ∝ min(1, P/P_sat)²</code>
        <span>§9.1</span>
      </li>
      <li>
        <code>½ burn · ½ stayers</code>
        <span>§9</span>
      </li>
      <li>
        <code>70 / 15 / 15</code>
        <span>§11</span>
      </li>
    </ul>
  );
}

export function EpochRail({
  tape,
  selected,
  onPick,
}: {
  tape: EpochTrace[];
  selected: number | null;
  onPick: (n: number) => void;
}) {
  const slice = tape.slice(-36);
  return (
    <div className="rail" role="list">
      {slice.map((e) => (
        <button
          key={e.n}
          type="button"
          role="listitem"
          className={`tick ${e.regime} ${selected === e.n ? "sel" : ""}`}
          style={{ height: `${12 + Math.min(36, Math.abs(e.F) * 2)}px` }}
          title={`E${e.n} F=${e.F.toFixed(2)} m=${e.mAfter.toFixed(2)}`}
          onClick={() => onPick(e.n)}
        />
      ))}
    </div>
  );
}

type Knob = { key: keyof SimParams; label: string; min: number; max: number; step: number };

const CORE: Knob[] = [
  { key: "mFloor", label: "m floor", min: 0.05, max: 1, step: 0.05 },
  { key: "mCeiling", label: "m ceiling", min: 0.5, max: 4, step: 0.1 },
  { key: "stepUp", label: "step up", min: 0.01, max: 0.5, step: 0.01 },
  { key: "baseIssuancePerDay", label: "base / day", min: 50_000, max: 2_000_000, step: 50_000 },
  { key: "feeCeiling", label: "fee ceiling", min: 0.05, max: 0.65, step: 0.01 },
  { key: "pressureSat", label: "P sat", min: 0.1, max: 1, step: 0.05 },
];

const EXTRA: Knob[] = [
  { key: "stepDown", label: "step down", min: 0.05, max: 2, step: 0.05 },
  { key: "feeFloor", label: "fee floor", min: 0, max: 0.05, step: 0.001 },
  { key: "goldEthPerOz", label: "ETH / oz", min: 0.2, max: 3, step: 0.01 },
  { key: "botVolume", label: "bot ETH vol", min: 2, max: 80, step: 1 },
  { key: "leaverSellFrac", label: "leaver sell", min: 0, max: 1, step: 0.05 },
  { key: "tradingFee", label: "swap fee", min: 0.0005, max: 0.03, step: 0.0005 },
];

function KnobList({
  knobs,
  params,
  onChange,
}: {
  knobs: Knob[];
  params: SimParams;
  onChange: (next: SimParams) => void;
}) {
  return (
    <ul>
      {knobs.map((k) => {
        const meta = params[k.key];
        if (typeof meta !== "object" || !("value" in meta) || typeof meta.value !== "number") return null;
        return (
          <li key={k.key}>
            <div className="row">
              <span>{k.label}</span>
              <span className={`badge ${meta.source === "wp" ? "wp" : "assumed"}`}>{meta.source === "wp" ? "wp" : "assumed"}</span>
              <b>{fmtKnob(meta.value)}</b>
            </div>
            <small>
              {meta.section} · {meta.note}
            </small>
            <input
              type="range"
              min={k.min}
              max={k.max}
              step={k.step}
              value={meta.value}
              onChange={(e) =>
                onChange({
                  ...params,
                  [k.key]: { ...meta, value: Number(e.target.value) },
                })
              }
            />
          </li>
        );
      })}
    </ul>
  );
}

export function ParamsPanel({
  params,
  onChange,
  t,
}: {
  params: SimParams;
  onChange: (next: SimParams) => void;
  t: Copy;
}) {
  return (
    <aside className="params" data-tour="params">
      <header>
        <h2>{t.params}</h2>
        <p>{t.paramsHint}</p>
      </header>
      <p className="locked-ids">
        <span>
          <i className="badge wp">wp</i> 70/15/15 §11
        </span>
        <span>
          <i className="badge wp">wp</i> ½ / ½ §9
        </span>
      </p>
      <label className="cut">
        <span>
          {t.cutMode} <i className="badge assumed">assumed</i>
        </span>
        <select
          value={params.cutMode.value}
          onChange={(e) =>
            onChange({
              ...params,
              cutMode: { ...params.cutMode, value: e.target.value as "instant_floor" | "step_down" },
            })
          }
        >
          <option value="instant_floor">{t.cutFloor}</option>
          <option value="step_down">{t.cutStep}</option>
        </select>
      </label>
      <KnobList knobs={CORE} params={params} onChange={onChange} />
      <details>
        <summary>{t.moreParams}</summary>
        <KnobList knobs={EXTRA} params={params} onChange={onChange} />
      </details>
    </aside>
  );
}

function fmtKnob(n: number) {
  if (n >= 1000) return n.toLocaleString();
  if (n < 0.01) return n.toFixed(4);
  return String(n);
}

function specRule(row: (typeof SPEC)[number], lang: Lang) {
  if (lang === "zh") return row.ruleZh;
  if (lang === "ko") return row.ruleKo;
  return row.rule;
}

export function Spec({ t, lang }: { t: Copy; lang: Lang }) {
  return (
    <section className="spec">
      <header className="page-head">
        <div>
          <h2>{t.specTitle}</h2>
          <span className="handle">{t.spec}</span>
          <p>{t.specSub}</p>
        </div>
      </header>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>{t.formula}</th>
          </tr>
        </thead>
        <tbody>
          {SPEC.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{specRule(row, lang)}</strong>
                <div className="muted">
                  {row.section}{" "}
                  <span className={`badge ${row.source === "wp" ? "wp" : "assumed"}`}>{row.source === "wp" ? t.wp : t.assumed}</span>
                </div>
              </td>
              <td>
                <code>{row.impl}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
