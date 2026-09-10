# STARV

Unofficial spec bench for [The Standard Reserve](https://www.standardreserve.xyz/whitepaper/).
Not affiliated. Community demo by [@brucelolzz](https://x.com/brucelolzz).

Live: https://starv-coral.vercel.app  
Repo: https://github.com/brucelu1126/starv

The paper is a design overview, not an implementation spec. This repo exists to **force a 7-day run** and check whether the identities in the whitepaper still hold.

UI is 中 / ENG / 한. Voice tour is English (Daniel). Default mode is Sandbox.

## Run it

```bash
npm i
npm run check    # formulas — must print "all identities held"
npm run dev      # http://localhost:5173
```

Node 22+ (the check script uses type stripping). No extra env files.

## What you are looking at

Three pages:

- **Machine** — one epoch of the bank. The only policy input is net ETH through the pool.
- **Defence** — the exit door. Leavers pay a quadratic fee; half burns, half pays whoever stayed.
- **Spec** — each claim → whitepaper section → a function you can grep.

Left rail, top to bottom: brand + Observer/Sandbox · Tour / Voice tour / Whitepaper · Machine / Defence / Spec.

- **Observer** — watch the tape, speed time. You cannot shove the pool.
- **Sandbox** — inject ETH, force a 20% or 40% seven-day run, twist numbers the paper left blank.

Click a part of the machine to open **Why** — the formula and the branch that epoch took.

## Whitepaper vs assumed

Launch numbers are blank in §14. Every sandbox knob is tagged:

- **whitepaper** — written as a rule or a number
- **assumed** — unpublished; the default is a reading, not a claim

`src/engine/spec.ts` is the full map.

## Identities `npm run check` guards

These are the ones the live tape has to obey:

| Rule | Section | Function |
| --- | --- | --- |
| `F_n = ETH_in − ETH_out` | §4.1 | `netFlow` |
| `signal_n = F_{n-1}+F_{n-2}` | §4.1 | `policySignal` |
| Fee routing on `sign(F_n)`; `0` is contraction | §4 / §5 | `regimeOf` |
| `I_n = base × d × m_n` | §5.1 | `issuance` |
| Raise earned one step; cut immediate | §5 | `nextMultiplier` |
| `P = W / max(D+W, ε)` | §9.1 | `exitPressure` |
| `fee = floor+(ceil−floor)×min(1,P/Psat)²` | §9.1 | `resolutionFee` |
| Half burn / half stayers | §9 | `splitResolution` |
| 70 / 15 / 15 | §11 | `splitProtocolEth` |
| `spend_tick = min(0.10V, 0.002R)` | §11.1 | `buybackTick` |
| `S_circ = 100M + M − B` | §3.1 | `supplies` |

Also asserted, not on the live tape: Dutch license curve §7.1, dormant bounty §10.

## Where to read

| File | What |
| --- | --- |
| `src/engine/formulas.ts` | The identities |
| `src/engine/check.ts` | The asserts |
| `src/engine/simulate.ts` | One epoch |
| `src/engine/params.ts` | wp vs assumed knobs |
| `src/engine/spec.ts` | Rule → section → function |
| `src/App.tsx` | UI |
