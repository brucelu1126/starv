import type { P } from "./params.ts";

/** WP (4.1): F_n = ETH_in − ETH_out */
export function netFlow(ethIn: number, ethOut: number): number {
  return ethIn - ethOut;
}

/** WP (4.1): signal_n = F_{n-1} + F_{n-2}. Missing history is 0. */
export function policySignal(prevFlows: number[], lookback = 2): number {
  let s = 0;
  for (let i = 1; i <= lookback; i++) {
    s += prevFlows[prevFlows.length - i] ?? 0;
  }
  return s;
}

/** WP §5: expansion iff current net flow is strictly positive. Zero is contraction. */
export function regimeOf(F: number): "expansion" | "contraction" {
  return F > 0 ? "expansion" : "contraction";
}

export type MBranch = "raise" | "cut_floor" | "cut_step" | "hold";

/**
 * WP (5.2) body is unpublished. The prose is not:
 *   "cuts are immediate, raises must be earned"
 *   issuance moves on signal_n, not on this epoch's F_n
 */
export function nextMultiplier(
  m: number,
  signal: number,
  p: P,
): { m: number; branch: MBranch } {
  if (signal > 0) {
    const raised = Math.min(p.mCeiling, m + p.stepUp);
    return { m: raised, branch: raised === m ? "hold" : "raise" };
  }
  if (p.cutMode === "instant_floor") {
    const cut = p.mFloor;
    return { m: cut, branch: cut === m ? "hold" : "cut_floor" };
  }
  const cut = Math.max(p.mFloor, m - p.stepDown);
  return { m: cut, branch: cut === m ? "hold" : "cut_step" };
}

/** WP (5.1): I_n = base × d × m_n. Stops when issuance budget is exhausted. */
export function issuance(m: number, mintedFromBudget: number, p: P): number {
  const raw = p.baseIssuancePerDay * p.epochDays * m;
  return Math.max(0, Math.min(raw, p.issuanceBudget - mintedFromBudget));
}

/** WP (9.1): P = W / max(D + W, ε) */
export function exitPressure(W: number, D: number, eps: number): number {
  return W / Math.max(D + W, eps);
}

/**
 * WP (9.1): quadratic from floor to ceiling, saturating at pressureSat.
 * fee = floor + (ceil − floor) × min(1, P / P_sat)²
 */
export function resolutionFee(P: number, p: P): number {
  const t = Math.min(1, Math.max(0, P / p.pressureSat));
  return p.feeFloor + (p.feeCeiling - p.feeFloor) * t * t;
}

export function splitResolution(gross: number, fee: number, p: P) {
  const charged = gross * fee;
  const burned = charged * p.resolutionBurnShare;
  const toStayers = charged - burned;
  const minted = gross - charged;
  return { charged, burned, toStayers, minted };
}

/** WP §11: 70 / 15 / 15 on all protocol ETH. */
export function splitProtocolEth(eth: number, p: P) {
  return {
    vault: eth * p.feeVault,
    pol: eth * p.feePol,
    team: eth * p.feeTeam,
  };
}

/** WP (11.1): spend_tick = min(0.10 × V, 0.002 × R) */
export function buybackTick(V: number, R: number, p: P): number {
  return Math.min(p.buybackVaultFrac * V, p.buybackPoolFrac * R);
}

/** Constant-product (full-range v4 ≈ v2). Fee taken in ETH on both sides. */
export function swapBuyStd(poolEth: number, poolStd: number, ethIn: number, fee: number) {
  const net = ethIn * (1 - fee);
  const k = poolEth * poolStd;
  const newEth = poolEth + net;
  const newStd = k / newEth;
  return { poolEth: newEth, poolStd: newStd, stdOut: poolStd - newStd, feeEth: ethIn - net };
}

export function swapSellStd(poolEth: number, poolStd: number, stdIn: number, fee: number) {
  const k = poolEth * poolStd;
  const newStd = poolStd + stdIn;
  const newEthGross = k / newStd;
  const ethOutGross = poolEth - newEthGross;
  const feeEth = ethOutGross * fee;
  const ethOut = ethOutGross - feeEth;
  return { poolEth: newEthGross, poolStd: newStd, ethOut, feeEth };
}

/** WP (3.1) (3.2) */
export function supplies(genesis: number, withdrawalMints: number, burned: number, hardCap: number) {
  return {
    circ: genesis + withdrawalMints - burned,
    max: hardCap - burned,
  };
}

export function licensePrice(tHours: number, pStart: number, pFloor: number): number {
  if (pStart <= 0) return pFloor;
  return pStart * (pFloor / pStart) ** (tHours / 24);
}

export function bounty(dormant: number, p: P): number {
  return Math.min(p.bountyCap, dormant * p.bountyShare);
}
