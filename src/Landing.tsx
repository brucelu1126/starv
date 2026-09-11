const PAPER = "https://www.standardreserve.xyz/whitepaper/";

function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11.4 2 9.9 4.2 V14.6 H8.9 V17.2 H7.8 V20 H11.4 Z" />
      <path d="M12.6 2.9 14.1 5.0 V15.0 H15.1 V17.5 H16.2 V20 H12.6 Z" />
      <path d="M11.4 8.9 H12.6 V9.3 H11.4 Z" />
    </svg>
  );
}

const CARDS = [
  {
    n: "01",
    kicker: "Holding STANDARD is not a license to issue",
    title: "The split",
    body: [
      "STANDARD is the tradable token. A charter is the operating license — like a seat. A branch is the unit that actually receives issuance.",
      "One charter opens with one branch and can grow to ten. Every branch has equal weight: your share of all branches is your share of that epoch's issue. Genesis is 1,000 founding charters, free — allowlist plus public, one per wallet, soulbound. After that, new charters sell at a daily ETH Dutch auction. Founding charters cannot be transferred.",
      "Buying STANDARD is a view on the token. Opening a branch is a view on future issuance. The number that matters is not the APY on the screen. It is the price of a branch, your share of N, and what it will cost to cash out.",
    ],
  },
  {
    n: "02",
    kicker: "Growing your bank burns the float",
    title: "Expansion burns",
    body: [
      "Want another branch? Buy an expansion license. Daily Dutch auction: price starts high and decays over 24 hours. Paid in STANDARD. 100% burned. The paper's curve is P(t) = P_start × (P_floor / P_start)^{t/24h}; a license day opens at 2× last close, a charter day at 3×.",
      "The protocol does not have to preach \"don't sell.\" Growing your bank is the highest-EV move inside the system, and it permanently shrinks circulating supply. That is the point: wanting more future share has to consume current tokens.",
      "More branches do not automatically mean more return. That depends on total N, the issuance rate, and the token price. You have to do the math.",
    ],
  },
  {
    n: "03",
    kicker: "To take the yield, retire the vehicle",
    title: "The exit",
    body: [
      "Issuance is a ledger credit. Tokens mint only when you withdraw — except the 100M genesis liquidity locked in the pool. To take profits you must retire a branch. Ten branches, book of 10,000: retire one, release 1,000, then the resolution fee. Remaining branches keep earning. Retire the last branch and the charter burns. The only way back is a new charter at auction.",
      "Ordinary rebase lets you sell some and keep the rest compounding. Standard adds a tradeoff: taking accrued yield means giving back some of the right to future issuance.",
      "The resolution fee moves with 7-day system-wide exit pressure — a quadratic from floor to ceiling. Half burns. Half pays whoever stayed. Withdrawals never pause or queue. Fee numbers were still unpublished in v0.1.",
    ],
    note: "Retiring your branch cuts your claim, not system issuance. Stayers get more tokens — that is not the same as more dollars. A rising fee can scare people into leaving earlier. This is a better allocation rule. It is not a proof that runs are solved.",
  },
  {
    n: "04",
    kicker: "One input: net ETH at one pool",
    title: "The signal",
    body: [
      "The bank watches one Uniswap v4 ETH / STANDARD pool: ETH in from buys minus ETH out from sells. Issuance moves on the last two completed epochs, summed. Sustained inflow loosens. Outflow tightens, and the cut is faster than the raise.",
      "\"Two epochs summed\" is not \"two epochs both green.\" +10 then −3 is still a positive signal. The latest hour can disagree with the rate. Fee routing is the fast lever: it flips on this epoch's sign. Issuance is the slow one.",
      "NET asks: what premium did the market pay over NAV? Standard asks: is marginal capital arriving or leaving? Neither description is a claim that the signal cannot be gamed.",
    ],
  },
  {
    n: "05",
    kicker: "Inflow stacks reserves. Outflow buys back.",
    title: "The vaults",
    body: [
      "Trading fees and later charter-auction ETH split 70 / 15 / 15: active vault, protocol-owned liquidity, team. That is protocol revenue — not user principal.",
      "This epoch's sign decides the vault. Net flow > 0: the expansion vault accumulates ETH and tokenized gold, and cannot sell the gold. Net flow ≤ 0: the contraction vault buys STANDARD and burns it, in rate-limited hourly ticks — min(10% of vault ETH, 0.2% of pool ETH). Caps the shot near 5% of pool depth per day. It does not erase slippage or MEV.",
      "Three clocks: fee routing uses this epoch; issuance uses the last two; the exit fee uses the trailing seven days. They can move together. They will not always.",
    ],
    note: "The whitepaper does not give token holders a right to redeem gold at NAV. Gold on the balance sheet is not a hard floor under the price.",
  },
  {
    n: "06",
    kicker: "The pieces exist elsewhere. The binding is the point.",
    title: "What's bound",
    body: [
      "A charter to operate branches and receive issuance. STANDARD burned to grow your share. A branch retired to take the yield. Issuance and fee use each flipping on the flow.",
      "Chase your own return and you also pay a cost of keeping the system. That is why this design showed up in this round of (3,3) essays. OHM described how good it looks when everyone holds. The open question is whether the rules still make sense when someone wants to leave and someone wants to stay.",
    ],
  },
];

export function Landing({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="landing">
      <header className="land-bar">
        <p className="land-brand">
          <Mark className="mark" />
          Standard
          <span>community demo</span>
        </p>
        <button type="button" className="land-launch" onClick={onLaunch}>
          Launch app
        </button>
      </header>

      <section className="land-hero">
        <h1>THE DOOR IS PRICED</h1>
        <p className="land-lede">
          An unofficial reading of The Standard Reserve. Holding together can look good. The hard part is pricing the door
          when someone wants out.
        </p>
        <p className="land-kicker">The mechanism in 6 cards · about four minutes</p>
        <p className="land-scroll">Scroll</p>
      </section>

      <div className="land-cards">
        {CARDS.map((card) => (
          <article key={card.n} className="land-card">
            <p className="land-num">
              {card.n} <span>{card.kicker}</span>
            </p>
            <h2>{card.title}</h2>
            {card.body.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
            {"note" in card && card.note && <p className="land-note">{card.note}</p>}
          </article>
        ))}

        <article className="land-card land-brake">
          <p className="land-num">
            07 <span>The paper is v0.1. This is not a pitch.</span>
          </p>
          <h2>Reservations</h2>
          <p>
            Launch numbers in §14 are blank. &quot;Code is immutable&quot; is not the same as &quot;no admin surface&quot; — scope,
            deployment, and audits still have to be checked separately.
          </p>
          <p>
            A 1B hard cap, 100M genesis liquidity, 900M issuance budget: that bounds supply. It does not make every period
            deflationary. Unwithdrawn ledger balances are still latent supply.
          </p>
          <p>Three questions that only a cold tape can answer:</p>
          <ul>
            <li>After the heat fades, will anyone still pay for a new branch?</li>
            <li>How much of that demand is new bankers, and how much is incumbents fighting over share?</li>
            <li>Can protocol revenue support a buyback of any real size?</li>
          </ul>
          <p>
            Until those have answers, the complexity is a hypothesis, not a result. Improving allocation is not solving a
            run. Holding gold is not a peg.
          </p>
        </article>
      </div>

      <footer className="land-foot">
        <button type="button" className="land-launch" onClick={onLaunch}>
          Launch app
        </button>
        <a href={PAPER} target="_blank" rel="noreferrer">
          Read the whitepaper
        </a>
        <p>
          standardreserve community demo by{" "}
          <a href="https://x.com/brucelolzz" target="_blank" rel="noreferrer">
            @brucelolzz
          </a>
          . Not affiliated.
        </p>
      </footer>
    </div>
  );
}
