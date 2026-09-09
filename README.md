# STARV

Live: https://starv-coral.vercel.app  
Repo: https://github.com/brucelu1126/starv

Unofficial [Standard Reserve](https://www.standardreserve.xyz/whitepaper/) spec bench.
Not affiliated. The paper is a design overview, not an implementation spec.

The point of this repo is not a story. It is to let you **force a 7-day run** and check whether the identities in the whitepaper still hold.

```bash
npm i
npm run check    # formula identities
npm run dev
```

## What is whitepaper vs assumed

Launch numbers are blank in §14. Every knob in the sandbox is tagged:

- **whitepaper** — written as a rule or a number
- **assumed** — unpublished; the default is a reading, not a claim

`src/engine/spec.ts` maps each rule → section → function.

## Identities the check file guards

| Rule | Section | Function |
| --- | --- | --- |
| `F_n = ETH_in − ETH_out` | §4.1 | `netFlow` |
| `signal_n = F_{n-1}+F_{n-2}` | §4.1 | `policySignal` |
| Fee routing on `sign(F_n)`; `0` is contraction | §4 / §5 | `regimeOf` |
| `I_n = base × d × m_n` | §5.1 | `issuance` |
| Raise earned one step; cut immediate | §5 | `nextMultiplier` |
| `P = W / max(D+W, ε)` | §9.1 | `exitPressure` |
| Quadratic fee, saturates at ceiling | §9.1 | `resolutionFee` |
| Half burn / half stayers | §9 | `splitResolution` |
| 70 / 15 / 15 | §11 | `splitProtocolEth` |
| `spend_tick = min(0.10V, 0.002R)` | §11.1 | `buybackTick` |
| `S_circ = 100M + M − B` | §3.1 | `supplies` |

## Two layers

- **Observer** — play the tape, speed time
- **Sandbox** — inject flow, force 20% / 40% seven-day runs on Machine or Defence, twist unpublished params, open the branch the machine took this epoch
