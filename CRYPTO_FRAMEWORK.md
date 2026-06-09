# Crypto Framework — on-chain + cycle overlay (binding for IBIT, ETHB, MSTR, BMNR)

**Status:** binding for all crypto-category tickers from 2026-06-08 forward.
**Why this exists:** the original crypto logic was pure price/momentum mechanical stops (e.g. IBIT $36.50 stop, BTC $64K bail line, ETHB $1,750 close-stop, ETF-outflow tracking). That framework is **pro-cyclical**: it forces exits into capitulation, which historically happens near cycle bottoms, not tops. On 2026-06-04/05 it sold IBIT and ETHB straight into a zone that on-chain and cycle data flagged as a historical bottoming region (200-week MA tag, >50% of supply underwater, MVRV-Z ~0.41, SOPR <1). Same evidence, opposite conclusion. The fix is a **synthesis**, not a replacement.

User's words (binding): crypto must be judged with on-chain data and historical cycle position, not price action alone.

---

## The two-layer split (do not collapse)

**Layer 1 — Mechanical discipline governs leverage and the survival line.**
Keep the stops and bail triggers for *leveraged or derivative-wrapper exposure* (ETF vehicles like IBIT/ETHB held tactically, treasury proxies like MSTR/BMNR). If this turns out to be a 2021-style cycle top (75% to 85% drawdowns), the mechanical line saves capital. A fired stop on a leveraged/tactical position is still honored.

**Layer 2 — On-chain + cycle regime read governs what happens AFTER a stop fires.**
The regime read decides whether a fired stop means "exit to cash and stay out" or "exit leverage but begin disciplined spot accumulation into the capitulation." This is the leg the old framework was missing. A fired tactical stop in a confirmed accumulation regime does NOT mean stay-flat-indefinitely; it means rotate from leveraged/tactical exposure into a laddered spot/core accumulation plan with objective triggers.

**Rule of thumb:** mechanical discipline sets the survival line; on-chain + cycle set the accumulate-vs-avoid bias. Never let on-chain optimism override a fired stop on a leveraged position, and never let a fired stop force a permanent "avoid" when the cycle says accumulate.

---

## Regime read — the indicators to pull every crypto round

Pull these (WebSearch is fine; cite the read date) and state each ticker's call as a function of them.

**Valuation / cycle position**
* MVRV and MVRV Z-score. >7 = euphoria/top zone; ~0 to 1 = fair value; <0 = deep-capitulation bottom zone.
* Realized price and short-term-holder (STH) cost basis. Price below STH cost basis = recent buyers underwater (mid-bear crossover).
* 200-week moving average. Tagged in every prior bear as long-term support.
* Halving-cycle position (months since the last halving; Apr 2024 = current cycle) and drawdown from ATH vs prior-cycle analogues.

**Supply / behavior**
* Supply-in-loss vs supply-in-profit. >50% of supply underwater has coincided with major bear bottoms.
* Long-term-holder (LTH) supply trend. New ATH mid-bear = accumulation.
* Exchange net flows and exchange reserves. Sustained outflows / multi-year-low reserves = accumulation/illiquidity.
* SOPR. <1 = coins moving at a loss (capitulation/mid-bear); reclaim of 1 = profit-taking returns / regime turn.

**Demand / positioning**
* Spot ETF net flows (BTC and ETH separately). Streak direction is an objective re-entry signal.
* Funding rate and open interest. OI flush + flat/negative funding = leverage cleaned out (de-risking, lowers forced-liquidation tail).
* For ETH specifically: ETH/BTC ratio, staking APR and validator queue, ETH ETF flows vs BTC. ETH is NOT a BTC clone — never use one shared price line.

---

## How the regime maps to rating + action (price-conditional, Rule #10)

| Regime read | Leveraged/ETF vehicle (IBIT, ETHB) | Treasury proxy (MSTR, BMNR) |
| --- | --- | --- |
| Top zone (MVRV-Z >5, supply mostly in profit, funding hot) | Trim/Sell; honor stops | Underweight/Sell (leverage + premium decay) |
| Distribution/rollover (price < STH cost basis, ETF outflows, SOPR <1, falling) | Exit tactical/leveraged exposure on stops; do NOT yet accumulate | Underweight/Sell; forced-seller + mNAV risk dominates |
| **Accumulation zone (200W-MA tag, >50% supply in loss, MVRV-Z ~0, OI flushed)** | **Exit leverage but BEGIN laddered spot accumulation; small first rung, reserve majority for deeper flush; rating reflects the ADD bias** | **Still avoid: express the BTC/ETH bottoming view via spot, not a levered/forced-seller balance sheet** |
| Confirmed turn (SOPR reclaims 1, ETF inflows resume, MVRV-Z rising off lows) | Add aggressively; rating Buy/Overweight | Re-rate only after mNAV discount + balance-sheet stress clear |

**Vehicle discrimination is the point.** In an accumulation zone, prefer un-levered spot (IBIT) over a forced-seller treasury proxy (MSTR/BMNR). A BTC-bottoming thesis is NOT a reason to own a company selling its BTC to fund preferred distributions.

**ETH vs BTC.** Judge ETHB on ETH's own on-chain (MVRV, ETH/BTC ratio, staking economics, ETH ETF flows), which in the 2026-06 window were materially weaker than BTC's. ETH accumulation is gated on an ETH/BTC base, not on BTC's bottoming signals.

---

## Worked example — 2026-06-05 re-derivation (the round that exposed the gap)

* **IBIT**: mechanical = Sell/avoid (BTC $64K bail fired). Synthesis = the ETF/leverage exit stays correct, BUT BTC at the 200W MA ($61.3K) with >50% supply underwater and MVRV-Z ~0.41 is a historical accumulation zone, so the call becomes "begin a small first-rung spot/core ladder, reserve the majority for a sub-$55K / sub-realized-price flush, objective add-confirmation on SOPR>1 and an ETF-outflow-streak break." Rating Sell -> Hold (accumulate slowly; overhead cost-basis wall $85-90K and a ~70% Fed-hike regime cap the size).
* **ETHB**: mechanical = Sell ($1,750 stop fired). Synthesis = ETH lacks BTC's bottoming confirmation (MVRV <1, ETH/BTC at a 10-month low 0.0283, staking APR collapsed to ~2.78%, ETH ETF outflows), so exit the leveraged stub but do NOT rush spot accumulation; gate it on an ETH/BTC base. Rating Sell -> Underweight (cautious, not capitulatory).
* **MSTR**: stays Sell. Even with BTC bottoming, the first net BTC sale since 2022 + forced-seller dynamics (funding STRC preferred) + mNAV compression mean the bottoming view is better expressed via spot. Vehicle to avoid here.
* **BMNR**: stays Underweight. ETH-levered treasury proxy = ETH structural weakness + treasury leverage + 9.5% weekly-pay preferred senior claim. Avoid.

This is the template: the overlay changed IBIT (avoid -> accumulate slowly) and nuanced ETHB (stop-loss -> structural-caution), while correctly keeping MSTR/BMNR as vehicles to avoid even in a BTC accumulation zone.
