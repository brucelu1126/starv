import { useEffect, useMemo, useRef, useState } from "react";
import { copy, type Lang } from "./i18n.ts";
import { defaultParams, values, type SimParams } from "./engine/params.ts";
import {
  armInject,
  armRun,
  genesisState,
  stepEpoch,
  type BranchId,
  type EpochTrace,
  type ScenarioId,
} from "./engine/simulate.ts";
import { Machine } from "./Machine.tsx";
import { Defence } from "./Defence.tsx";
import { EpochRail, Identities, ParamsPanel, Spec, StateStrip, WhyCard } from "./panels.tsx";
import { TourCard, tourSteps } from "./Tour.tsx";

const PAPER = "https://www.standardreserve.xyz/whitepaper/";

type Page = "machine" | "defence" | "spec";
type Mode = "observer" | "sandbox";
type Sheet = "live" | "why" | "ledger";

const SEEN = "starv-seen";
const INTRO = "/intro-voice.mp3?v=2";

function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11.4 2 9.9 4.2 V14.6 H8.9 V17.2 H7.8 V20 H11.4 Z" />
      <path d="M12.6 2.9 14.1 5.0 V15.0 H15.1 V17.5 H16.2 V20 H12.6 Z" />
      <path d="M11.4 8.9 H12.6 V9.3 H11.4 Z" />
    </svg>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone?: "plus" | "minus" | "" }) {
  return (
    <div className={`stat ${tone ?? ""}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toFixed(0);
}

export function App({ onHome }: { onHome?: () => void }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("starv-lang");
    return saved === "zh" || saved === "ko" ? saved : "en";
  });
  const [mode, setMode] = useState<Mode>("sandbox");
  const [page, setPage] = useState<Page>("machine");
  const [sheet, setSheet] = useState<Sheet>("live");
  const [guide, setGuide] = useState<number | null>(() => (localStorage.getItem(SEEN) ? null : 0));
  const [params, setParams] = useState<SimParams>(defaultParams);
  const [scenario, setScenario] = useState<ScenarioId>("calm");
  const [tape, setTape] = useState<EpochTrace[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [lit, setLit] = useState<BranchId>("read_Fn");
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [talking, setTalking] = useState(false);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef(genesisState(values(defaultParams())));
  const t = copy[lang];
  const p = useMemo(() => values(params), [params]);
  const steps = tourSteps(lang);
  const guideStep = guide !== null ? steps[guide] : null;

  useEffect(() => {
    if (!guideStep) return;
    setPage(guideStep.page);
    setMode(guideStep.mode);
    setPlaying(false);
    if (guideStep.spot === "why") setSheet("why");
    if (guideStep.spot === "machine" || guideStep.spot === "hands") setSheet("live");
  }, [guide, lang]);

  useEffect(() => {
    localStorage.setItem("starv-lang", lang);
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : lang === "ko" ? "ko" : "en";
    const clip = voiceRef.current;
    if (clip) {
      clip.pause();
      clip.currentTime = 0;
    }
    setTalking(false);
  }, [lang]);

  useEffect(() => {
    const clip = new Audio(INTRO);
    clip.preload = "auto";
    const done = () => setTalking(false);
    clip.addEventListener("ended", done);
    clip.addEventListener("error", done);
    voiceRef.current = clip;
    return () => {
      clip.pause();
      clip.removeEventListener("ended", done);
      clip.removeEventListener("error", done);
    };
  }, []);

  function toggleVoice() {
    const clip = voiceRef.current;
    if (!clip) return;
    if (talking) {
      clip.pause();
      clip.currentTime = 0;
      setTalking(false);
      return;
    }
    clip.currentTime = 0;
    setTalking(true);
    void clip.play().catch(() => setTalking(false));
  }

  function reset(next = params, scene = scenario) {
    stateRef.current = genesisState(values(next));
    if (scene === "run20") stateRef.current = armRun(stateRef.current, 0.2, 7);
    if (scene === "run40") stateRef.current = armRun(stateRef.current, 0.4, 7);
    setTape([]);
    setSelected(null);
  }

  function tick(scene = scenario) {
    const r = stepEpoch(stateRef.current, p, scene === "run20" || scene === "run40" ? "calm" : scene);
    stateRef.current = r.state;
    setTape((prev) => [...prev.slice(-119), r.trace]);
    setSelected(r.trace.n);
  }

  useEffect(() => {
    reset(params, scenario);
    const seed: EpochTrace[] = [];
    for (let i = 0; i < 4; i++) {
      const r = stepEpoch(stateRef.current, values(params), scenario === "run20" || scenario === "run40" ? "calm" : scenario);
      stateRef.current = r.state;
      seed.push(r.trace);
    }
    setTape(seed);
    setSelected(seed.at(-1)?.n ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, scenario]);

  useEffect(() => {
    if (!playing || (page !== "machine" && page !== "defence")) return;
    const id = window.setInterval(() => tick(), 1400 / speed);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, page, scenario, p]);

  const last = tape.find((e) => e.n === selected) ?? tape.at(-1) ?? null;
  const dead = last !== null && last.D < p.startInternal * 0.05;
  const picked = tape.find((e) => e.n === selected);
  const defLast = picked && picked.withdrawn > 0 ? picked : [...tape].reverse().find((e) => e.withdrawn > 0) ?? last;

  const hands = (
    <div className={`hands ${guideStep?.spot === "hands" ? "spot" : ""}`} data-tour="hands">
      <button
        type="button"
        onClick={() => {
          stateRef.current = armInject(stateRef.current, 40, 0);
          tick();
        }}
      >
        {t.injectIn} +40
      </button>
      <button
        type="button"
        onClick={() => {
          stateRef.current = armInject(stateRef.current, 0, 40);
          tick();
        }}
      >
        {t.injectOut} −40
      </button>
      <button
        type="button"
        className="danger"
        onClick={() => {
          stateRef.current = armRun(stateRef.current, 0.2, 7);
          setPlaying(true);
          tick();
        }}
      >
        {t.force20}
      </button>
      <button
        type="button"
        className="danger"
        onClick={() => {
          stateRef.current = armRun(stateRef.current, 0.4, 7);
          setPlaying(true);
          tick();
        }}
      >
        {t.force40}
      </button>
    </div>
  );

  const transport = (
    <div className="transport">
      <button type="button" onClick={() => setPlaying((v) => !v)}>
        {playing ? t.pause : t.play}
      </button>
      <button type="button" onClick={() => tick()}>
        {t.step}
      </button>
      <button type="button" onClick={() => reset()}>
        {t.reset}
      </button>
      <label>
        {t.speed}
        <input type="range" min={0.5} max={4} step={0.5} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
      </label>
      {mode === "sandbox" && (
        <label>
          {t.scenario}
          <select value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioId)}>
            <option value="calm">{t.calm}</option>
            <option value="expansion">{t.expansion}</option>
            <option value="outflow">{t.outflow}</option>
            <option value="run20">{t.run20}</option>
            <option value="run40">{t.run40}</option>
          </select>
        </label>
      )}
    </div>
  );

  return (
    <div className={`app ${mode}`}>
      <aside className="side">
        <div className="side-top">
          <button type="button" className="side-brand" onClick={onHome} aria-label="Home">
            <Mark className="mark" />
            <p className="brand-lockup">
              Standard<span>[community demo]</span>
            </p>
          </button>
          <div className={`modes ${guideStep?.spot === "modes" ? "spot" : ""}`} data-tour="modes">
            <button
              type="button"
              className={mode === "observer" ? "on" : ""}
              onClick={() => {
                setMode("observer");
                if (scenario === "run20" || scenario === "run40") setScenario("calm");
              }}
            >
              {t.observer}
            </button>
            <button type="button" className={mode === "sandbox" ? "on" : ""} onClick={() => setMode("sandbox")}>
              {t.sandbox}
            </button>
          </div>
          <div className="side-gap" />
          <nav className="side-nav">
            <button type="button" className="nav-btn" onClick={() => setGuide(0)}>
              <Icon d="M12 21a9 9 0 1 0-9-9M12 8v5l3 2" />
              {t.replayTour}
            </button>
            <button
              type="button"
              className={`nav-btn voice-btn ${talking ? "on" : ""}`}
              aria-label={talking ? t.voiceStop : t.voice}
              aria-pressed={talking}
              onClick={toggleVoice}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="1.7" fill="currentColor" />
                <path
                  d="M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8M6.2 6.2a8.2 8.2 0 0 0 0 11.6M17.8 6.2a8.2 8.2 0 0 1 0 11.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              {t.voice}
            </button>
            <a className="nav-btn" href={PAPER} target="_blank" rel="noreferrer">
              <Icon d="M6 4h9l3 3v13H6zM9 10h6M9 14h6" />
              {t.paperLink}
            </a>
          </nav>
          <div className="side-gap" />
          <nav className={`side-nav ${guideStep?.spot === "nav" ? "spot" : ""}`} data-tour="nav">
            <button type="button" className={`nav-btn ${page === "machine" ? "on" : ""}`} onClick={() => setPage("machine")}>
              <Icon d="M4 7h16v10H4zM8 7V5h8v2M9 12h6" />
              {t.machine}
            </button>
            <button type="button" className={`nav-btn ${page === "defence" ? "on" : ""}`} onClick={() => setPage("defence")}>
              <Icon d="M12 3l8 3v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6z" />
              {t.defence}
            </button>
            <button type="button" className={`nav-btn ${page === "spec" ? "on" : ""}`} onClick={() => setPage("spec")}>
              <Icon d="M7 4h10v16H7zM10 8h4M10 12h4M10 16h3" />
              {t.spec}
            </button>
          </nav>
        </div>
        <div className="side-foot">
          <div className="lang">
            <button type="button" className={lang === "zh" ? "on" : ""} onClick={() => setLang("zh")} aria-label="中文">
              中
            </button>
            <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")} aria-label="English">
              ENG
            </button>
            <button type="button" className={lang === "ko" ? "on" : ""} onClick={() => setLang("ko")} aria-label="한국어">
              한
            </button>
          </div>
          <div className="side-credit">
            <p>
              standardreserve community demo by{" "}
              <a href="https://x.com/brucelolzz" target="_blank" rel="noreferrer">
                @brucelolzz
              </a>
            </p>
            <p>
              thanks{" "}
              <a href="https://x.com/0xbeans" target="_blank" rel="noreferrer">
                @0xbeans
              </a>
            </p>
            <Mark />
          </div>
        </div>
      </aside>

      <div className="main">
        {page === "defence" &&
          (mode === "sandbox" ? (
            <div className="work">
              <div className="stage">
                <Defence last={defLast} params={params} t={t} />
                {hands}
                {last && last.withdrawn > 0 && (
                  <p className={`verdict ${dead ? "bad" : "ok"}`}>
                    <b>{t.died}</b> {dead ? t.diedYes : t.diedNo}
                  </p>
                )}
              </div>
              <ParamsPanel params={params} onChange={setParams} t={t} />
            </div>
          ) : (
            <Defence last={defLast} params={params} t={t} />
          ))}
        {page === "spec" && <Spec t={t} lang={lang} />}

        {page === "machine" && (
          <div className="work">
            <div className="stage">
              <header className="page-head">
                <div>
                  <h1>{t.brand}</h1>
                  <span className="handle">{mode === "observer" ? t.observer : t.sandbox}</span>
                  <p className="meta">
                    {mode === "observer" ? t.observerHint : t.sandboxHint} · {t.friendNote}
                  </p>
                </div>
              </header>

              {last && (
                <div className="stats">
                  <Card label={t.price} value={last.price.toFixed(6)} />
                  <Card
                    label={t.netFlow}
                    value={`${last.F > 0 ? "+" : ""}${last.F.toFixed(2)}`}
                    tone={last.F > 0 ? "plus" : "minus"}
                  />
                  <Card label={t.pressure} value={`${(last.pressure * 100).toFixed(1)}%`} />
                </div>
              )}

              <div className="tabs">
                {(["live", "why", "ledger"] as const).map((id) => (
                  <button key={id} type="button" className={sheet === id ? "on" : ""} onClick={() => setSheet(id)}>
                    {id === "live" ? t.tabLive : id === "why" ? t.tabWhy : t.tabLedger}
                  </button>
                ))}
              </div>
              <div className={`sheet ${guideStep?.spot === "why" ? "spot" : ""}`} data-tour="why">
                {sheet === "live" && (
                  <>
                    <div data-tour="machine" className={`fill ${guideStep?.spot === "machine" ? "spot" : ""}`}>
                      <Machine
                        last={last}
                        lit={lit}
                        onLit={(id) => {
                          setLit(id);
                          if (guideStep?.spot !== "machine") setSheet("why");
                        }}
                        playing={playing}
                      />
                    </div>
                    {transport}
                    {mode === "sandbox" && hands}
                    <EpochRail tape={tape} selected={selected} onPick={setSelected} />
                  </>
                )}
                {sheet === "why" && (
                  <>
                    <Identities />
                    <StateStrip last={last} lit={lit} onLit={setLit} />
                    <WhyCard last={last} lit={lit} t={t} />
                  </>
                )}
                {sheet === "ledger" && last && (
                  <dl className="readout">
                    <div>
                      <dt>{t.epoch}</dt>
                      <dd>{String(last.n).padStart(4, "0")}</dd>
                    </div>
                    <div>
                      <dt>{t.circ}</dt>
                      <dd>{fmt(last.circ)}</dd>
                    </div>
                    <div>
                      <dt>{t.burned}</dt>
                      <dd>{fmt(last.burned)}</dd>
                    </div>
                    <div>
                      <dt>{t.price}</dt>
                      <dd>{last.price.toFixed(9)}</dd>
                    </div>
                    <div>
                      <dt>{t.netFlow}</dt>
                      <dd className={last.F > 0 ? "plus" : "minus"}>
                        {last.F > 0 ? "+" : ""}
                        {last.F.toFixed(2)}
                      </dd>
                    </div>
                    <div>
                      <dt>{t.signal}</dt>
                      <dd>{last.signal.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>{t.multiplier}</dt>
                      <dd>
                        {last.mBefore.toFixed(2)}→{last.mAfter.toFixed(2)}
                      </dd>
                    </div>
                    <div>
                      <dt>{t.regime}</dt>
                      <dd className={last.regime}>{last.regime === "expansion" ? t.regimeExp : t.regimeCon}</dd>
                    </div>
                    <div>
                      <dt>{t.issued}</dt>
                      <dd>{last.issued.toFixed(0)}</dd>
                    </div>
                    <div>
                      <dt>{t.gold}</dt>
                      <dd>{last.goldOz.toFixed(2)} oz</dd>
                    </div>
                    <div>
                      <dt>{t.toStayers}</dt>
                      <dd>{last.toStayers.toFixed(0)}</dd>
                    </div>
                    <div>
                      <dt>{t.pressure}</dt>
                      <dd>{(last.pressure * 100).toFixed(1)}%</dd>
                    </div>
                    <div>
                      <dt>{t.resFee}</dt>
                      <dd title="floor+(ceil−floor)×min(1,P/Psat)²">{(last.resFee * 100).toFixed(2)}%</dd>
                    </div>
                    <div>
                      <dt>70/15/15</dt>
                      <dd title="vault / POL / team">
                        {last.vaultEth.toFixed(2)}/{last.polEth.toFixed(2)}/{last.teamEth.toFixed(2)}
                      </dd>
                    </div>
                    <div>
                      <dt>{t.internal}</dt>
                      <dd>{last.D.toFixed(0)}</dd>
                    </div>
                  </dl>
                )}
              </div>

              {mode === "sandbox" && last && last.withdrawn > 0 && (
                <p className={`verdict ${dead ? "bad" : "ok"}`}>
                  <b>{t.died}</b> {dead ? t.diedYes : t.diedNo}
                </p>
              )}
            </div>
            {mode === "sandbox" && (
              <div className={guideStep?.spot === "params" ? "spot" : ""}>
                <ParamsPanel params={params} onChange={setParams} t={t} />
              </div>
            )}
          </div>
        )}
      </div>

      {guide !== null && guideStep && (
        <TourCard
          step={guideStep}
          i={guide}
          n={steps.length}
          t={t}
          onPrev={() => setGuide(Math.max(0, guide - 1))}
          onNext={() => {
            if (guide >= steps.length - 1) {
              localStorage.setItem(SEEN, "1");
              setGuide(null);
              setPage("machine");
              setMode("sandbox");
              setPlaying(true);
              return;
            }
            setGuide(guide + 1);
          }}
          onSkip={() => {
            localStorage.setItem(SEEN, "1");
            setGuide(null);
            setPage("machine");
            setMode("sandbox");
            setPlaying(true);
          }}
        />
      )}
    </div>
  );
}
