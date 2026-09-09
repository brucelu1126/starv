import { defaultParams, values, type SimParams, type P } from "./params.ts";
import {
  buybackTick,
  exitPressure,
  issuance,
  netFlow,
  nextMultiplier,
  policySignal,
  regimeOf,
  resolutionFee,
  splitProtocolEth,
  splitResolution,
  supplies,
  swapBuyStd,
  swapSellStd,
  type MBranch,
} from "./formulas.ts";

export type Regime = "expansion" | "contraction";

export type Shock =
  | { kind: "none" }
  | { kind: "inject"; ethIn: number; ethOut: number }
  | { kind: "run"; shareOfBank: number; days: number; remaining: number };

export type BranchId =
  | "read_Fn"
  | "regime"
  | "signal"
  | "m_update"
  | "issue"
  | "fee_split"
  | "vault"
  | "exits";

export type EpochTrace = {
  n: number;
  ethIn: number;
  ethOut: number;
  F: number;
  signal: number;
  regime: Regime;
  mBefore: number;
  mAfter: number;
  mBranch: MBranch;
  issued: number;
  feeEth: number;
  vaultEth: number;
  polEth: number;
  teamEth: number;
  goldOz: number;
  goldDelta: number;
  buybackEth: number;
  buybackStd: number;
  withdrawn: number;
  pressure: number;
  resFee: number;
  feeBurned: number;
  toStayers: number;
  minted: number;
  D: number;
  branches: number;
  poolEth: number;
  poolStd: number;
  price: number;
  circ: number;
  burned: number;
  contractionVault: number;
  why: Record<BranchId, string>;
};

export type BankState = {
  n: number;
  flows: number[];
  m: number;
  D: number;
  branches: number;
  poolEth: number;
  poolStd: number;
  goldOz: number;
  contractionVault: number;
  issuedFromBudget: number;
  withdrawalMints: number;
  burned: number;
  trailW: number[];
  shock: Shock;
};

export type ScenarioId = "calm" | "expansion" | "outflow" | "run20" | "run40";

export function genesisState(p: P): BankState {
  return {
    n: 0,
    flows: [],
    m: p.mLaunch,
    D: p.startInternal,
    branches: p.startBranches,
    poolEth: p.genesisPoolEth,
    poolStd: p.genesisLiq,
    goldOz: 0,
    contractionVault: 0,
    issuedFromBudget: 0,
    withdrawalMints: 0,
    burned: 0,
    trailW: [],
    shock: { kind: "none" },
  };
}

function botTape(p: P, scenario: ScenarioId, n: number) {
  const vol = p.botVolume;
  if (scenario === "expansion") return { ethIn: vol * 0.85, ethOut: vol * 0.15 };
  if (scenario === "outflow") return { ethIn: vol * 0.2, ethOut: vol * 0.8 };
  const wave = 0.12 * Math.sin(n / 3.2);
  const buy = Math.min(0.85, Math.max(0.15, p.botBuyBias + wave));
  return { ethIn: vol * buy, ethOut: vol * (1 - buy) };
}

function buy(s: BankState, ethIn: number, fee: number) {
  if (ethIn <= 0 || s.poolStd <= 1) return { feeEth: 0, stdOut: 0, ethIn: 0 };
  const r = swapBuyStd(s.poolEth, s.poolStd, ethIn, fee);
  s.poolEth = r.poolEth;
  s.poolStd = r.poolStd;
  return { feeEth: r.feeEth, stdOut: r.stdOut, ethIn };
}

function sellForEth(s: BankState, wantEthOut: number, fee: number) {
  if (wantEthOut <= 0 || s.poolEth <= 1) return { feeEth: 0, ethOut: 0 };
  const px = s.poolEth / s.poolStd;
  const stdIn = wantEthOut / Math.max(px * (1 - fee), 1e-12);
  const r = swapSellStd(s.poolEth, s.poolStd, stdIn, fee);
  s.poolEth = r.poolEth;
  s.poolStd = r.poolStd;
  return { feeEth: r.feeEth, ethOut: r.ethOut };
}

function sellStd(s: BankState, stdIn: number, fee: number) {
  if (stdIn <= 0 || s.poolEth <= 1) return { feeEth: 0, ethOut: 0 };
  const r = swapSellStd(s.poolEth, s.poolStd, stdIn, fee);
  s.poolEth = r.poolEth;
  s.poolStd = r.poolStd;
  return { feeEth: r.feeEth, ethOut: r.ethOut };
}

export function stepEpoch(
  prev: BankState,
  p: P,
  scenario: ScenarioId,
  extra?: { injectIn?: number; injectOut?: number; forceW?: number },
): { state: BankState; trace: EpochTrace } {
  const s: BankState = {
    ...prev,
    flows: prev.flows.slice(),
    trailW: prev.trailW.slice(),
    shock: { ...prev.shock },
    n: prev.n + 1,
  };

  const tape = botTape(p, scenario, s.n);
  let wantIn = tape.ethIn + (extra?.injectIn ?? 0);
  let wantOut = tape.ethOut + (extra?.injectOut ?? 0);

  if (s.shock.kind === "inject") {
    wantIn += s.shock.ethIn;
    wantOut += s.shock.ethOut;
    s.shock = { kind: "none" };
  }

  let forceW = extra?.forceW ?? 0;
  if (s.shock.kind === "run") {
    const slice = s.shock.remaining / s.shock.days;
    forceW += slice;
    const leftDays = s.shock.days - 1;
    const leftW = s.shock.remaining - slice;
    s.shock =
      leftDays <= 0 || leftW <= 0
        ? { kind: "none" }
        : { ...s.shock, days: leftDays, remaining: leftW };
  }

  // §9 exits before the tape so dumped mints hit this epoch's F_n.
  const W7prev = s.trailW.reduce((a, b) => a + b, 0);
  const take = Math.min(forceW, s.D);
  const Dafter = s.D - take;
  const pressure = exitPressure(W7prev + take, Dafter, p.pressureEps);
  const resFee = resolutionFee(pressure, p);
  const exit =
    take > 0
      ? splitResolution(take, resFee, p)
      : { charged: 0, burned: 0, toStayers: 0, minted: 0 };

  if (take > 0) {
    s.D = Dafter + exit.toStayers;
    s.withdrawalMints += exit.minted;
    s.burned += exit.burned;
    const frac = take / Math.max(take + Dafter, 1);
    s.branches = Math.max(1, s.branches * (1 - frac));
  }
  s.trailW.push(take);
  while (s.trailW.length > 7) s.trailW.shift();

  const dump = sellStd(s, exit.minted * p.leaverSellFrac, p.tradingFee);
  const bought = buy(s, wantIn, p.tradingFee);
  const botSold = sellForEth(s, wantOut, p.tradingFee);

  const grossIn = bought.ethIn;
  const grossOut = dump.ethOut + botSold.ethOut;
  const Fn = netFlow(grossIn, grossOut);
  const regime = regimeOf(Fn);
  const signal = policySignal(s.flows, p.signalLookback);
  const mBefore = s.m;
  const issued = issuance(mBefore, s.issuedFromBudget, p);
  s.issuedFromBudget += issued;
  s.D += issued;

  const feeEth = bought.feeEth + dump.feeEth + botSold.feeEth;
  const auctionEth = scenario === "expansion" ? 1.2 : scenario === "calm" ? 0.25 : 0.02;
  const proto = splitProtocolEth(feeEth + auctionEth, p);

  let goldDelta = 0;
  let buybackEth = 0;
  let buybackStd = 0;
  if (regime === "expansion") {
    goldDelta = proto.vault / Math.max(p.goldEthPerOz, 1e-9);
    s.goldOz += goldDelta;
  } else {
    s.contractionVault += proto.vault;
    for (let t = 0; t < p.ticksPerEpoch; t++) {
      const spend = buybackTick(s.contractionVault, s.poolEth, p);
      if (spend <= 1e-9) break;
      const r = buy(s, spend, p.tradingFee);
      s.contractionVault -= spend;
      s.burned += r.stdOut;
      buybackEth += spend;
      buybackStd += r.stdOut;
    }
  }

  // §11 POL: half swapped to $STANDARD, paired, added forever.
  const half = proto.pol * 0.5;
  if (half > 0) {
    const r = buy(s, half, p.tradingFee);
    s.poolEth += proto.pol - half;
    s.poolStd += r.stdOut;
  }

  // Don't evaluate a 2-epoch signal until two epochs exist. Launch m is otherwise immediately cut by F_{-1}=F_{-2}=0.
  const mNext =
    s.flows.length < p.signalLookback
      ? { m: mBefore, branch: "hold" as const }
      : nextMultiplier(mBefore, signal, p);
  s.m = mNext.m;
  s.flows.push(Fn);

  const sup = supplies(p.genesisLiq, s.withdrawalMints, s.burned, p.hardCap);
  const why: EpochTrace["why"] = {
    read_Fn: `F_n = ${fmt(grossIn)} − ${fmt(grossOut)} = ${fmt(Fn)} ETH. Hook counts ETH, not volume. §4.1`,
    regime: `sign(F_n)=${Fn > 0 ? "+" : "≤0"} → ${regime.toUpperCase()}. Fee routing uses this epoch only. §4 / §5`,
    signal: `signal_n = F_{n-1}+F_{n-2} = ${fmt(signal)}. Issuance ignores this hour's spike. §4.1`,
    m_update: `m ${mBefore.toFixed(2)} → ${mNext.m.toFixed(2)} (${mNext.branch}). Raise is earned; cut is immediate. §5`,
    issue: `I_n = ${p.baseIssuancePerDay} × ${p.epochDays} × ${mBefore.toFixed(2)} = ${issued.toFixed(0)} to ${s.branches.toFixed(0)} branches. §5.1`,
    fee_split: `${fmt(feeEth + auctionEth)} ETH × 70/15/15 → vault ${fmt(proto.vault)} / POL ${fmt(proto.pol)} / team ${fmt(proto.team)}. §11`,
    vault:
      regime === "expansion"
        ? `Expansion vault bought ${goldDelta.toFixed(3)} oz. Vault cannot sell. §11`
        : `Contraction: ${p.ticksPerEpoch} ticks of min(0.10V, 0.002R) spent ${fmt(buybackEth)} ETH, burned ${buybackStd.toFixed(0)}. §11.1`,
    exits: `W=${take.toFixed(0)}  P=W/max(D+W,ε)=${pressure.toFixed(3)}  fee=${(resFee * 100).toFixed(2)}%  burn ${exit.burned.toFixed(0)} / stayers ${exit.toStayers.toFixed(0)}. §9.1`,
  };

  return {
    state: s,
    trace: {
      n: s.n,
      ethIn: grossIn,
      ethOut: grossOut,
      F: Fn,
      signal,
      regime,
      mBefore,
      mAfter: mNext.m,
      mBranch: mNext.branch,
      issued,
      feeEth: feeEth + auctionEth,
      vaultEth: proto.vault,
      polEth: proto.pol,
      teamEth: proto.team,
      goldOz: s.goldOz,
      goldDelta,
      buybackEth,
      buybackStd,
      withdrawn: take,
      pressure,
      resFee,
      feeBurned: exit.burned,
      toStayers: exit.toStayers,
      minted: exit.minted,
      D: s.D,
      branches: s.branches,
      poolEth: s.poolEth,
      poolStd: s.poolStd,
      price: s.poolEth / s.poolStd,
      circ: sup.circ,
      burned: s.burned,
      contractionVault: s.contractionVault,
      why,
    },
  };
}

function fmt(n: number) {
  return (n >= 0 ? "+" : "") + n.toFixed(3);
}

export function armRun(state: BankState, share: number, days = 7): BankState {
  return {
    ...state,
    shock: { kind: "run", shareOfBank: share, days, remaining: state.D * share },
  };
}

export function armInject(state: BankState, ethIn: number, ethOut: number): BankState {
  return { ...state, shock: { kind: "inject", ethIn, ethOut } };
}

export function runN(
  params: SimParams,
  scenario: ScenarioId,
  epochs: number,
  afterGenesis?: (s: BankState) => BankState,
): { state: BankState; tape: EpochTrace[] } {
  const p = values(params);
  let state = genesisState(p);
  if (afterGenesis) state = afterGenesis(state);
  const tape: EpochTrace[] = [];
  for (let i = 0; i < epochs; i++) {
    const r = stepEpoch(state, p, scenario);
    state = r.state;
    tape.push(r.trace);
  }
  return { state, tape };
}

export { defaultParams, values };
