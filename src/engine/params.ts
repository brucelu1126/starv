/** Every number the simulator uses. `wp` = written in the whitepaper. `assumed` = §14 still blank. */

export type Source = "wp" | "assumed";

export type ParamMeta<T> = {
  value: T;
  source: Source;
  section: string;
  note: string;
};

export type CutMode = "instant_floor" | "step_down";

export type SimParams = {
  hardCap: ParamMeta<number>;
  genesisLiq: ParamMeta<number>;
  issuanceBudget: ParamMeta<number>;
  foundingCharters: ParamMeta<number>;
  branchesPerCharterMax: ParamMeta<number>;
  licensesPerDay: ParamMeta<number>;
  licensePerCharterDay: ParamMeta<number>;
  licenseOpenMult: ParamMeta<number>;
  charterOpenMult: ParamMeta<number>;
  feeVault: ParamMeta<number>;
  feePol: ParamMeta<number>;
  feeTeam: ParamMeta<number>;
  resolutionBurnShare: ParamMeta<number>;
  revocationFee: ParamMeta<number>;
  dormancyDays: ParamMeta<number>;
  bountyShare: ParamMeta<number>;
  bountyCap: ParamMeta<number>;
  buybackVaultFrac: ParamMeta<number>;
  buybackPoolFrac: ParamMeta<number>;
  ticksPerEpoch: ParamMeta<number>;
  /** Issuance uses trailing two completed epochs. WP (4.1) */
  signalLookback: ParamMeta<number>;
  epochDays: ParamMeta<number>;
  baseIssuancePerDay: ParamMeta<number>;
  mLaunch: ParamMeta<number>;
  mFloor: ParamMeta<number>;
  mCeiling: ParamMeta<number>;
  stepUp: ParamMeta<number>;
  stepDown: ParamMeta<number>;
  cutMode: ParamMeta<CutMode>;
  feeFloor: ParamMeta<number>;
  feeCeiling: ParamMeta<number>;
  pressureSat: ParamMeta<number>;
  pressureEps: ParamMeta<number>;
  tradingFee: ParamMeta<number>;
  goldEthPerOz: ParamMeta<number>;
  genesisPoolEth: ParamMeta<number>;
  startInternal: ParamMeta<number>;
  startBranches: ParamMeta<number>;
  leaverSellFrac: ParamMeta<number>;
  botBuyBias: ParamMeta<number>;
  botVolume: ParamMeta<number>;
};

export function defaultParams(): SimParams {
  return {
    hardCap: {
      value: 1_000_000_000,
      source: "wp",
      section: "§3",
      note: "1B hard cap, 18 decimals",
    },
    genesisLiq: {
      value: 100_000_000,
      source: "wp",
      section: "§3",
      note: "Only pre-mint. Full-range POL, never withdrawable",
    },
    issuanceBudget: {
      value: 900_000_000,
      source: "wp",
      section: "§3",
      note: "Cap minus genesis. Base issuance stops when this is reached",
    },
    foundingCharters: {
      value: 1000,
      source: "wp",
      section: "§6",
      note: "Free genesis. Limit one per wallet",
    },
    branchesPerCharterMax: {
      value: 10,
      source: "wp",
      section: "§7",
      note: "First branch included; more require a burned license",
    },
    licensesPerDay: {
      value: 100,
      source: "wp",
      section: "§8",
      note: "Unsold do not roll over",
    },
    licensePerCharterDay: {
      value: 3,
      source: "wp",
      section: "§8",
      note: "Per-charter daily cap",
    },
    licenseOpenMult: {
      value: 2,
      source: "wp",
      section: "§8",
      note: "P_start = 2 × P_last",
    },
    charterOpenMult: {
      value: 3,
      source: "wp",
      section: "§8",
      note: "Seats reprice faster than licenses (3× vs 2×)",
    },
    feeVault: {
      value: 0.7,
      source: "wp",
      section: "§11",
      note: "Active vault by that epoch's sign(F_n)",
    },
    feePol: {
      value: 0.15,
      source: "wp",
      section: "§11",
      note: "Half swapped to $STANDARD, paired forever",
    },
    feeTeam: {
      value: 0.15,
      source: "wp",
      section: "§11",
      note: "Team share. Always, both regimes",
    },
    resolutionBurnShare: {
      value: 0.5,
      source: "wp",
      section: "§9",
      note: "Half burned. Other half paid to stayers",
    },
    revocationFee: {
      value: 0.7,
      source: "wp",
      section: "§10",
      note: "Deliberately worse than worst-case resolution fee",
    },
    dormancyDays: {
      value: 30,
      source: "wp",
      section: "§10",
      note: "Anyone can report after 30 inactive days",
    },
    bountyShare: {
      value: 0.02,
      source: "wp",
      section: "§10",
      note: "2% of dormant balance",
    },
    bountyCap: {
      value: 100_000,
      source: "wp",
      section: "§10",
      note: "Hard cap on informant bounty",
    },
    buybackVaultFrac: {
      value: 0.1,
      source: "wp",
      section: "§11.1",
      note: "min(0.10 × V, 0.002 × R) per hourly tick",
    },
    buybackPoolFrac: {
      value: 0.002,
      source: "wp",
      section: "§11.1",
      note: "24 × 0.002 ≈ 4.8% of pool depth / day",
    },
    ticksPerEpoch: {
      value: 24,
      source: "assumed",
      section: "§11.1 / §14",
      note: "Hourly ticks are wp. 24 follows from the assumed 1-day epoch",
    },
    signalLookback: {
      value: 2,
      source: "wp",
      section: "§4.1",
      note: "signal_n = F_{n-1} + F_{n-2}",
    },
    epochDays: {
      value: 1,
      source: "assumed",
      section: "§14 / §5",
      note: "Epoch length unpublished. Bench uses 1 day so 7-day exit window = 7 epochs",
    },
    baseIssuancePerDay: {
      value: 500_000,
      source: "assumed",
      section: "§5.1 / §14",
      note: "I_n = base × d × m_n. Base rate is a blank in the paper",
    },
    mLaunch: {
      value: 1,
      source: "assumed",
      section: "§5.2 / §14",
      note: "Launch m unpublished",
    },
    mFloor: {
      value: 0.2,
      source: "assumed",
      section: "§5.2 / §14",
      note: "Multiplier floor unpublished",
    },
    mCeiling: {
      value: 2,
      source: "assumed",
      section: "§5.2 / §14",
      note: "Multiplier ceiling unpublished",
    },
    stepUp: {
      value: 0.05,
      source: "assumed",
      section: "§5",
      note: "Raises must be earned, one step per epoch when signal > 0",
    },
    stepDown: {
      value: 0.5,
      source: "assumed",
      section: "§5",
      note: "Only used if cutMode = step_down",
    },
    cutMode: {
      value: "instant_floor",
      source: "assumed",
      section: "§5",
      note: "Paper: cuts immediate, raises earned. Default slams to floor. Toggle to test a step cut",
    },
    feeFloor: {
      value: 0.005,
      source: "assumed",
      section: "§9.1 / §14",
      note: "Quiet-day floor unpublished. Paper: near-zero on a quiet day",
    },
    feeCeiling: {
      value: 0.35,
      source: "assumed",
      section: "§9.1 / §14",
      note: "Must stay below 70% revocation (§10). 35% is a reading of the blank ceiling",
    },
    pressureSat: {
      value: 0.5,
      source: "assumed",
      section: "§9.1",
      note: "Quadratic saturates when this fraction of (D+W) tried to leave in 7 days",
    },
    pressureEps: {
      value: 1,
      source: "assumed",
      section: "§9.1",
      note: "WP: P = W / max(D+W, ε). ε unpublished; 1 token avoids div/0",
    },
    tradingFee: {
      value: 0.003,
      source: "assumed",
      section: "§11 / §14",
      note: "Trading fee unpublished. Both sides pay ETH (§13)",
    },
    goldEthPerOz: {
      value: 0.87,
      source: "assumed",
      section: "§11",
      note: "Gold purchase price in ETH/oz. Not a protocol param — market",
    },
    genesisPoolEth: {
      value: 200,
      source: "assumed",
      section: "§3",
      note: "ETH side of genesis POL. Paper does not state the seed ETH",
    },
    startInternal: {
      value: 12_000_000,
      source: "assumed",
      section: "sim",
      note: "Internal ledger D at t0 so a run has something to drain",
    },
    startBranches: {
      value: 1400,
      source: "assumed",
      section: "sim",
      note: "1000 genesis + some expanded branches",
    },
    leaverSellFrac: {
      value: 0.8,
      source: "assumed",
      section: "sim",
      note: "Share of minted exit tokens dumped into the pool. Not in the paper",
    },
    botBuyBias: {
      value: 0.55,
      source: "assumed",
      section: "sim",
      note: "Observer-bot buy fraction in a calm tape",
    },
    botVolume: {
      value: 18,
      source: "assumed",
      section: "sim",
      note: "Typical epoch gross ETH volume from bots",
    },
  };
}

export function values(p: SimParams) {
  return {
    hardCap: p.hardCap.value,
    genesisLiq: p.genesisLiq.value,
    issuanceBudget: p.issuanceBudget.value,
    foundingCharters: p.foundingCharters.value,
    branchesPerCharterMax: p.branchesPerCharterMax.value,
    licensesPerDay: p.licensesPerDay.value,
    licensePerCharterDay: p.licensePerCharterDay.value,
    licenseOpenMult: p.licenseOpenMult.value,
    charterOpenMult: p.charterOpenMult.value,
    feeVault: p.feeVault.value,
    feePol: p.feePol.value,
    feeTeam: p.feeTeam.value,
    resolutionBurnShare: p.resolutionBurnShare.value,
    revocationFee: p.revocationFee.value,
    dormancyDays: p.dormancyDays.value,
    bountyShare: p.bountyShare.value,
    bountyCap: p.bountyCap.value,
    buybackVaultFrac: p.buybackVaultFrac.value,
    buybackPoolFrac: p.buybackPoolFrac.value,
    ticksPerEpoch: p.ticksPerEpoch.value,
    signalLookback: p.signalLookback.value,
    epochDays: p.epochDays.value,
    baseIssuancePerDay: p.baseIssuancePerDay.value,
    mLaunch: p.mLaunch.value,
    mFloor: p.mFloor.value,
    mCeiling: p.mCeiling.value,
    stepUp: p.stepUp.value,
    stepDown: p.stepDown.value,
    cutMode: p.cutMode.value,
    feeFloor: p.feeFloor.value,
    feeCeiling: p.feeCeiling.value,
    pressureSat: p.pressureSat.value,
    pressureEps: p.pressureEps.value,
    tradingFee: p.tradingFee.value,
    goldEthPerOz: p.goldEthPerOz.value,
    genesisPoolEth: p.genesisPoolEth.value,
    startInternal: p.startInternal.value,
    startBranches: p.startBranches.value,
    leaverSellFrac: p.leaverSellFrac.value,
    botBuyBias: p.botBuyBias.value,
    botVolume: p.botVolume.value,
  };
}

export type P = ReturnType<typeof values>;
