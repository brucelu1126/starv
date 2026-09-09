/**
 * One runnable check. Fails the process if a whitepaper identity breaks.
 *   npm run check
 */
import { defaultParams, values } from "./params.ts";
import {
  buybackTick,
  exitPressure,
  issuance,
  nextMultiplier,
  policySignal,
  regimeOf,
  resolutionFee,
  splitProtocolEth,
  splitResolution,
  supplies,
} from "./formulas.ts";
import { armRun, runN } from "./simulate.ts";
import { fitCam, iso } from "../iso.ts";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok  ", msg);
  }
}

const p = values(defaultParams());

assert(regimeOf(1) === "expansion", "F>0 is expansion");
assert(regimeOf(0) === "contraction", "F=0 is contraction §5");
assert(regimeOf(-0.1) === "contraction", "F<0 is contraction");

assert(policySignal([3, -1]) === 2, "signal_n = F_{n-1}+F_{n-2}");
assert(policySignal([10]) === 10, "missing lookback epoch is 0");

const raise1 = nextMultiplier(1, 4, p);
assert(raise1.branch === "raise" && Math.abs(raise1.m - 1.05) < 1e-12, "positive signal steps m up once");
const raiseHold = nextMultiplier(p.mCeiling, 4, p);
assert(raiseHold.branch === "hold", "raise saturates at ceiling");

const cut = nextMultiplier(1.8, -2, { ...p, cutMode: "instant_floor" });
assert(cut.m === p.mFloor && cut.branch === "cut_floor", "negative signal slams m to floor");

const stepCut = nextMultiplier(1.8, -2, { ...p, cutMode: "step_down" });
assert(Math.abs(stepCut.m - 1.3) < 1e-12, "optional step_down subtracts stepDown");

assert(issuance(1, 0, p) === p.baseIssuancePerDay * p.epochDays, "I = base × d × m");
assert(issuance(1, p.issuanceBudget - 10, p) === 10, "issuance clamps to remaining budget");

assert(Math.abs(exitPressure(40, 60, 1) - 0.4) < 1e-12, "P = W/(D+W)");
assert(exitPressure(0, 0, 1) === 0, "empty bank uses ε");

const quiet = resolutionFee(0, p);
const sat = resolutionFee(p.pressureSat, p);
const over = resolutionFee(p.pressureSat * 3, p);
const midP = p.pressureSat / 2;
const mid = resolutionFee(midP, p);
const expectedMid = p.feeFloor + (p.feeCeiling - p.feeFloor) * 0.25;
assert(Math.abs(quiet - p.feeFloor) < 1e-12, "fee at P=0 is floor");
assert(Math.abs(sat - p.feeCeiling) < 1e-12, "fee saturates at ceiling");
assert(Math.abs(over - p.feeCeiling) < 1e-12, "fee stays at ceiling past sat");
assert(Math.abs(mid - expectedMid) < 1e-12, "quadratic: half pressure → 1/4 of the span");
assert(p.feeCeiling < p.revocationFee, "resolution ceiling < 70% revocation §10");

const split = splitResolution(1000, 0.2, p);
assert(split.charged === 200 && split.burned === 100 && split.toStayers === 100 && split.minted === 800, "half burn / half stayers");

const fees = splitProtocolEth(100, p);
assert(Math.abs(fees.vault + fees.pol + fees.team - 100) < 1e-12, "70/15/15 sums to 1");
assert(fees.vault === 70 && fees.pol === 15 && fees.team === 15, "70/15/15 exact");

assert(buybackTick(100, 1000, p) === 2, "tick bound by 0.002R when vault is fat");
assert(buybackTick(5, 1000, p) === 0.5, "tick bound by 0.10V when vault is thin");

const sup = supplies(100_000_000, 5, 2, 1_000_000_000);
assert(sup.circ === 100_000_003 && sup.max === 999_999_998, "§3.1 / §3.2 identities");

const calm = runN(defaultParams(), "expansion", 8);
const firstRaiseAt = calm.tape.findIndex((t) => t.mBranch === "raise");
assert(firstRaiseAt >= 2, "m cannot raise before two inflow epochs sit in the lookback");
assert(
  calm.tape.every((t) => (t.F > 0 ? t.regime === "expansion" : t.regime === "contraction")),
  "regime tracks sign(F_n), not the signal",
);

const run = runN(defaultParams(), "calm", 10, (s) => armRun(s, 0.4, 7));
const lastRun = run.tape[6];
assert(lastRun !== undefined, "7-day 40% run produces a tape");
assert(lastRun.pressure > 0.3, "coordinated 40% run shows up in 7-day pressure");
assert(lastRun.resFee > 0.1, "fee actually climbs in a run");
assert(lastRun.toStayers > 0 && lastRun.feeBurned > 0, "leavers pay stayers; half burns");
assert(
  run.tape.slice(0, 7).every((t) => t.withdrawn > 0),
  "run is not paused — each of 7 days still exits",
);

const cam = fitCam(
  [
    [0, 0, 0],
    [10, 10, 4],
    [-2, 8, 0],
  ],
  400,
  300,
  20,
);
const corners = [
  iso(0, 0, 0, cam),
  iso(10, 10, 4, cam),
  iso(-2, 8, 0, cam),
];
assert(
  corners.every((p) => p.x >= 20 && p.x <= 380 && p.y >= 20 && p.y <= 280),
  "iso fit keeps the scene inside the canvas",
);
const spun = fitCam(
  [
    [0, 0, 0],
    [10, 10, 4],
    [-2, 8, 0],
  ],
  400,
  300,
  20,
  { yaw: Math.PI / 2, pitch: 0.2 },
  [4, 5],
);
assert(
  [
    iso(0, 0, 0, spun),
    iso(10, 10, 4, spun),
    iso(-2, 8, 0, spun),
  ].every((p) => p.x >= 20 && p.x <= 380 && p.y >= 20 && p.y <= 280),
  "iso fit stays inside after a 90° yaw",
);

if (process.exitCode) {
  console.error("\ncheck failed");
  process.exit(1);
}
console.log("\nall identities held");
