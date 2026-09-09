import type { Copy } from "./i18n.ts";
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

export function Onboard({
  step,
  setStep,
  t,
  lang,
  onSandbox,
}: {
  step: number;
  setStep: (n: number) => void;
  t: Copy;
  lang: "en" | "zh";
  onSandbox: () => void;
}) {
  const stops = [
          {
            title: "One signal",
            titleZh: "一個訊號",
            body: "The hook counts ETH in from buys minus ETH out from sells. Volume is not an input. Wash trades that don't move ETH do not move policy.",
            bodyZh: "Hook 只數買入 ETH 減賣出 ETH。成交量不是輸入。洗量如果不搬 ETH，就搬不動政策。",
            section: "§4",
            formula: "F_n = ETH_in − ETH_out",
          },
          {
            title: "Two levers, two clocks",
            titleZh: "兩根槓桿，兩個時鐘",
            body: "Fee routing flips on this epoch's sign(F_n). Issuance waits for signal_n = F_{n-1}+F_{n-2}. One fat buy cannot print a rate hike. One fat sell can flip the vault today.",
            bodyZh: "Fee 路由看當期 sign(F_n)。發行看前兩期加總。一筆大買印不出升息；一筆大賣今天就能翻金庫。",
            section: "§4 / §5",
            formula: "signal_n = F_{n-1} + F_{n-2}",
          },
          {
            title: "The ratchet is asymmetric",
            titleZh: "棘輪不對稱",
            body: "Raises are earned, one step per positive signal. Cuts land at once. The paper's (5.2) numbers are still blank — the sandbox lets you pick slam-to-floor versus a large step.",
            bodyZh: "升息要賺，正 signal 一次一步。降息立刻落地。(5.2) 的數字還是空白——沙盒讓你選砍到地板，或大步下砍。",
            section: "§5",
            formula: "m_{n+1} = raise(m) if signal>0 else cut(m)",
          },
          {
            title: "70 / 15 / 15",
            titleZh: "70 / 15 / 15",
            body: "Every protocol ETH — swap fees and charter auctions — splits the same way. 70% to the active vault, 15% forever-POL, 15% team. Expansion buys gold. Contraction buybacks on min(0.10V, 0.002R) per hour.",
            bodyZh: "所有協議 ETH（交易費與特許拍賣）同一套切法。70% 進作用中金庫，15% 永久 POL，15% 團隊。擴張買金。收縮每小時按 min(0.10V, 0.002R) 回購。",
            section: "§11",
            formula: "spend_tick = min(0.10V, 0.002R)",
          },
          {
            title: "The door is congestion priced",
            titleZh: "門口用擁擠定價",
            body: "P = W / max(D+W, ε) over seven days. Fee is a quadratic up to a ceiling. Half burns. Half pays stayers. Withdrawals never pause.",
            bodyZh: "P = 七日提款 / max(留下+提款, ε)。費率走二次曲線直到天花板。一半燒、一半給留下的人。提款從不暫停。",
            section: "§9.1",
            formula: "fee = floor + (ceil−floor) × min(1, P/P_sat)²",
          },
          {
            title: "Now break it",
            titleZh: "現在去搞爆它",
            body: "Observer is for watching. Sandbox is for a forced 20% or 40% seven-day run. If the identities hold, the bank gets more defensive the worse the door gets — it does not unwind.",
            bodyZh: "觀察層用來看。沙盒用來強制一場 20% 或 40% 的七日擠兌。若恆等式成立，門口越擠，系統越防衛——而不是自己拆掉。",
            section: "§13.4",
            formula: "cut + buyback + priced door, same epoch",
          },
        ];
  const s = stops[step]!;
  const zh = lang === "zh";
  return (
    <section className="onboard">
      <header>
        <p className="kicker">
          {step + 1} / {stops.length}
        </p>
        <h2>{t.onboardTitle}</h2>
        <p>{t.onboardSub}</p>
      </header>
      <article>
        <p className="section">{s.section}</p>
        <h3>{zh ? s.titleZh : s.title}</h3>
        <p>{zh ? s.bodyZh : s.body}</p>
        <pre>{s.formula}</pre>
      </article>
      <footer>
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>
          {t.prev}
        </button>
        {step < stops.length - 1 ? (
          <button type="button" className="primary" onClick={() => setStep(step + 1)}>
            {t.next}
          </button>
        ) : (
          <button type="button" className="primary" onClick={onSandbox}>
            {t.startSandbox}
          </button>
        )}
      </footer>
    </section>
  );
}

export function Spec({ t, lang }: { t: Copy; lang: "en" | "zh" }) {
  return (
    <section className="spec">
      <header>
        <h2>{t.specTitle}</h2>
        <p>{t.specSub}</p>
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
                <strong>{lang === "zh" ? row.ruleZh : row.rule}</strong>
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
      <p className="muted">
        <a href="https://github.com/brucelu1126/starv" target="_blank" rel="noreferrer">
          {t.github}
        </a>
        {" · "}
        <code>npm run check</code>
      </p>
    </section>
  );
}
