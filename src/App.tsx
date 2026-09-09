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

const REPO = "https://github.com/brucelu1126/starv";

type Page = "machine" | "defence" | "spec";
type Mode = "observer" | "sandbox";

const SEEN = "starv-seen";

const VOICE_SKIP =
  /samantha|karen|allison|ava\b|aria|jenny|siri|flo|shelley|moira|zira|sonia|kathy|tessa|美佳|婷婷|ting-?ting|mei-?jia|grandma|grandpa|junior|sandy|fred|albert|ralph|whisper|zarvox|boing|organ|trinoids|bubbles|hysterical|jester|superstar|wobble|bells|bahh|bad news|good news|rocko|princess|cellos/i;

function pickVoice(lang: Lang) {
  const prefix = lang === "zh" ? "zh" : "en";
  const preferLang = lang === "zh" ? "zh-tw" : "en-gb";
  const keys =
    lang === "zh"
      ? ["reed", "eddy", "yunyang", "yunxi"]
      : ["daniel", "reed", "eddy", "alex", "rishi", "guy", "davis", "andrew"];
  const pool = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(prefix) && !VOICE_SKIP.test(v.name));
  let best: SpeechSynthesisVoice | undefined;
  let bestScore = -1;
  for (const v of pool) {
    const n = v.name.toLowerCase();
    const ki = keys.findIndex((k) => n.includes(k));
    const score = (ki === -1 ? 0 : (keys.length - ki) * 10) + (v.lang.toLowerCase().startsWith(preferLang) ? 2 : 0);
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best ?? pool[0];
}

export function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("starv-lang") === "zh" ? "zh" : "en"));
  const [mode, setMode] = useState<Mode>("observer");
  const [page, setPage] = useState<Page>("machine");
  const [guide, setGuide] = useState<number | null>(() => (localStorage.getItem(SEEN) ? null : 0));
  const [params, setParams] = useState<SimParams>(defaultParams);
  const [scenario, setScenario] = useState<ScenarioId>("calm");
  const [tape, setTape] = useState<EpochTrace[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [lit, setLit] = useState<BranchId>("read_Fn");
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [talking, setTalking] = useState(false);
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
  }, [guide, lang]);

  useEffect(() => {
    localStorage.setItem("starv-lang", lang);
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    speechSynthesis.cancel();
    setTalking(false);
  }, [lang]);

  useEffect(() => {
    speechSynthesis.getVoices();
    return () => speechSynthesis.cancel();
  }, []);

  function toggleVoice() {
    if (talking) {
      speechSynthesis.cancel();
      setTalking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(t.voiceIntro);
    u.rate = lang === "zh" ? 1.2 : 1.18;
    u.pitch = 1;
    const voice = pickVoice(lang);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = lang === "zh" ? "zh-TW" : "en-GB";
    }
    u.onend = () => setTalking(false);
    u.onerror = () => setTalking(false);
    setTalking(true);
    speechSynthesis.speak(u);
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
    // seed a few epochs so the machine is not empty
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
  const defLast = tape.find((e) => e.n === selected) ?? [...tape].reverse().find((e) => e.withdrawn > 0) ?? last;

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

  return (
    <div className={`app ${mode}`}>
      <header className="top">
        <div className="brand">
          <img className="mark" src="/mark.png" width={36} height={36} alt="" />
          <div>
            <strong>{t.brand}</strong>
            <em>
              {t.creditBefore}{" "}
              <a href="https://www.standardreserve.xyz/whitepaper/" target="_blank" rel="noreferrer">
                {t.creditPaper}
              </a>{" "}
              {t.creditAfter}{" "}
              <a href="https://x.com/brucelolzz" target="_blank" rel="noreferrer">
                @brucelolzz
              </a>
              {" · "}
              <a href={REPO} target="_blank" rel="noreferrer">
                {t.github}
              </a>
            </em>
          </div>
        </div>
        <nav className={`pages ${guideStep?.spot === "nav" ? "spot" : ""}`} data-tour="nav">
          {(["machine", "defence", "spec"] as const).map((id) => (
            <button key={id} type="button" className={page === id ? "on" : ""} onClick={() => setPage(id)}>
              {t[id]}
            </button>
          ))}
        </nav>
        <div className="tour-row">
          <button type="button" className="tour-btn" onClick={() => setGuide(0)}>
            {t.replayTour}
          </button>
          <button
            type="button"
            className={`voice-btn ${talking ? "on" : ""}`}
            aria-label={talking ? t.voiceStop : t.voice}
            aria-pressed={talking}
            onClick={toggleVoice}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="1.7" fill="currentColor" />
              <path
                d="M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M6.2 6.2a8.2 8.2 0 0 0 0 11.6M17.8 6.2a8.2 8.2 0 0 1 0 11.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
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
        <div className="lang">
          <button type="button" className={lang === "zh" ? "on" : ""} onClick={() => setLang("zh")} aria-label="中文">
            中
          </button>
          <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")} aria-label="English">
            ENG
          </button>
        </div>
      </header>

      {page === "defence" &&
        (mode === "sandbox" ? (
          <div className="work">
            <div className="stage">
              <Identities />
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
          <>
            <Identities />
            <Defence last={defLast} params={params} t={t} />
          </>
        ))}
      {page === "spec" && <Spec t={t} lang={lang} />}

      {page === "machine" && (
        <div className="work">
          <div className="stage">
            <p className="hint">{mode === "observer" ? t.observerHint : t.sandboxHint}</p>
            <Identities />
            <div data-tour="machine" className={guideStep?.spot === "machine" ? "spot" : ""}>
              <Machine last={last} lit={lit} onLit={setLit} playing={playing} />
            </div>
            <div data-tour="why" className={guideStep?.spot === "why" ? "spot" : ""}>
              <StateStrip last={last} lit={lit} onLit={setLit} />
              <WhyCard last={last} lit={lit} t={t} />
            </div>
            <EpochRail tape={tape} selected={selected} onPick={setSelected} />

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

            {mode === "sandbox" && hands}

            {last && (
              <dl className="readout">
                <div>
                  <dt>{t.epoch}</dt>
                  <dd>{String(last.n).padStart(4, "0")}</dd>
                </div>
                <div>
                  <dt>{t.circ}</dt>
                  <dd>{last.circ >= 1e6 ? `${(last.circ / 1e6).toFixed(2)}M` : last.circ.toFixed(0)}</dd>
                </div>
                <div>
                  <dt>{t.burned}</dt>
                  <dd>{last.burned >= 1e6 ? `${(last.burned / 1e6).toFixed(2)}M` : last.burned.toFixed(0)}</dd>
                </div>
                <div>
                  <dt>{t.price}</dt>
                  <dd>{last.price.toFixed(9)}</dd>
                </div>
                <div>
                  <dt>{t.netFlow}</dt>
                  <dd className={last.F >= 0 ? "plus" : "minus"}>
                    {last.F >= 0 ? "+" : ""}
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
                  <dd className={last.regime}>{last.regime}</dd>
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
              setMode("observer");
              setPlaying(true);
              return;
            }
            setGuide(guide + 1);
          }}
          onSkip={() => {
            localStorage.setItem(SEEN, "1");
            setGuide(null);
            setPage("machine");
            setMode("observer");
            setPlaying(true);
          }}
        />
      )}
    </div>
  );
}
