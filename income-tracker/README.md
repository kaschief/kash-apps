# Income Tracker

Trading income planner: turn a monthly cash target into a prop-firm payout
plan, and show the resulting German take-home pay.

## Scripts

```
npm run dev       # http://localhost:5174
npm run build
npm run preview   # http://localhost:4174
```

Ports are pinned in `vite.config.js` (dev 5174 / preview 4174) so this app
and `consistency-tracker` can run side by side without colliding.

## German tax constants (2026)

The rates and thresholds in `IncomeTracker.tsx` (`TAX_FREE_ALLOWANCE`,
`ZONE_*_END`, `SOLI_RATE`, `CHURCH_TAX_RATE`, insurance rates/ceilings,
etc.) come from:

- Income tax (EStG §32a): https://www.bundesfinanzministerium.de
- 2026 bracket changes: https://perfinex.de/germany-2026-tax-changes/
- Social security rates: https://www.tk.de/en/become-a-member/join-tk/contribution-rate-social-security-2037092
- Contribution ceilings: https://germanpedia.com/contribution-assessment-ceiling-germany/
- 2026 ceiling increases: https://ogletree.com/insights-resources/blog-posts/germany-increases-social-security-contribution-and-compulsory-insurance-ceilings-effective-january-1-2026/

Update this list (and the constants) each time Germany publishes new
brackets/ceilings.

## Calculation engine

`computeBreakdown` / `calculateGermanIncomeTax` / `solveGrossForNet` /
`computeEmployerSocial` are the single source of truth for gross↔net German
tax math. The main form, the income-level comparison table, and the
employee-vs-freelancer ladder all call into these — there is no duplicated
tax pipeline anywhere else in the component.

`solveGrossForNet` inverts the forward calculation by bisection (net is
monotonic in gross), since the German formula has no closed-form inverse.

## Prop account planner

`computePayoutPlan` turns "I want €X cash this month" into a concrete
account plan by working backwards through the firm's rules:

```
cash target ÷ profit split           = profit that must be WITHDRAWN
trading days ÷ min winning days      = payout CYCLES available this month
cap × cycles                         = profit one account can release
withdrawn profit ÷ that              = accounts to copy-trade
+ buffer kept per account            = profit each account must EARN
earned ÷ trading days                = daily target per account
```

Two distinctions drive the whole model:

- **Withdraw vs. earn** — withdrawing every cent of profit resets an
  account to its starting balance and erases the drawdown cushion. So the
  first payout cycle has to earn the buffer *on top of* the withdrawal;
  once the buffer exists, later months only need to earn the withdrawal
  itself.
- **Accounts vs. payouts** — the payout cap limits one *request*, but every
  block of `minQualifyingDays` winning days unlocks another request. A
  month is a *sequence* of payout events (all copied accounts request
  together), and the plan lays that sequence out event by event.

Eligibility rules (minimum winning days, minimum profit for a day to
count) don't change the arithmetic — they decide whether the resulting
plan is *valid*, so they surface as pass/fail checks (`checks.*`) rather
than feeding back into the numbers.

Account-size presets default to LucidFlex rules: five qualifying days per
request, account-specific daily profit thresholds, 50% of cycle profit
available to withdraw, at least $1 net-positive between requests, and the
account-size payout cap. Every value remains editable so the planner can model
other firms. Picking a preset defines the account-specific parts of the
firm in one tap, and every value stays editable afterwards.
