import type { IncomeTrackerModel } from "../hooks/useIncomeTracker";
import {
  CheckRow,
  CollapsibleSection,
  DeductionRow,
  Segmented,
  StatCard,
} from "./ui";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const eur = (value: number) => `€${formatNumber(value)}`;
const eur0 = (value: number) =>
  `€${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}`;

export function TrackerResults({ model }: { model: IncomeTrackerModel }) {
  const {
    payout,
    calculations,
    minQualifyingDays,
    minProfitPerDay,
    bufferPerAccount,
    riskBand,
    setAccountsOverride,
    employmentMode,
    setEmploymentMode,
    isMarried,
    setIsMarried,
    hasChurchTax,
    setHasChurchTax,
    monthlyExpenses,
    setMonthlyExpenses,
    visibleLevels,
    comparisonLevels,
    showAllLevels,
    setShowAllLevels,
    hoursPerDay,
    ec,
  } = model;

  return (
    <>
        <section className="rounded-xl border border-green-500/25 bg-green-500/[0.05] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wider text-gray-500">
              3 · The Plan
            </h2>
            {payout.status === "ok" && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                  payout.checks.valid
                    ? "bg-green-500/15 text-green-400"
                    : "bg-red-500/15 text-red-400"
                }`}>
                {payout.checks.valid
                  ? "Payout-valid"
                  : payout.shortfall > 0
                    ? `${eur0(payout.shortfall)} short of target`
                    : "Breaks firm rules"}
              </span>
            )}
          </div>

          {payout.status === "ok" ? (
            <>
              <div className="grid grid-cols-2 gap-y-4 divide-gray-700/60 sm:grid-cols-4 sm:gap-y-0 sm:divide-x">
                <div className="px-2 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 sm:mb-1">
                    Accounts
                  </div>
                  <div className="mt-0.5 text-xl font-bold tabular-nums text-green-400 sm:mt-0 sm:text-3xl">
                    {payout.accountsNeeded}
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-500 sm:mt-1">
                    {payout.accountsForced
                      ? `your choice · ${payout.recommendedAccounts} recommended`
                      : "copy-traded as one"}
                  </div>
                </div>
                <div className="px-2 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 sm:mb-1">
                    Each Account Earns
                  </div>
                  <div className="mt-0.5 text-xl font-bold tabular-nums text-white sm:mt-0 sm:text-3xl">
                    {eur0(payout.perAccountEarnBuild)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-500 sm:mt-1">
                    {eur0(payout.perAccountWithdraw)} withdrawn +{" "}
                    {eur0(payout.perAccountEarnBuild - payout.perAccountWithdraw)}{" "}
                    buffer
                  </div>
                </div>
                <div className="px-2 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 sm:mb-1">
                    Daily Target
                  </div>
                  <div className="mt-0.5 text-xl font-bold tabular-nums text-white sm:mt-0 sm:text-3xl">
                    {eur0(payout.dailyPace)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-500 sm:mt-1">
                    {payout.paceForced
                      ? `your pace · plan needs ${eur0(payout.dailyNeeded)}`
                      : `per account · ${calculations.tradingDaysPerMonth} days`}
                  </div>
                </div>
                <div className="px-2 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 sm:mb-1">
                    You Receive
                  </div>
                  <div className="mt-0.5 text-xl font-bold tabular-nums text-green-400 sm:mt-0 sm:text-3xl">
                    {eur0(payout.totalCash)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-500 sm:mt-1">
                    {payout.shortfall > 0
                      ? `of the ${eur0(payout.incomeTarget)} target`
                      : `over ${payout.cyclesUsed} payout${payout.cyclesUsed === 1 ? "" : "s"}`}
                  </div>
                </div>
              </div>

              {payout.perAccountEarnBuild > payout.perAccountWithdraw && (
                <p className="mt-4 border-t border-gray-700/60 pt-3 text-center text-[11px] text-gray-500">
                  The buffer is earned once. From next month{" "}
                  {eur0(payout.perAccountEarnSteady)} per account is enough —{" "}
                  {eur0(payout.perAccountDailySteady)}/day.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Enter an income target and a profit split to see the plan.
            </p>
          )}
        </section>

        {payout.status === "ok" && (
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xs uppercase tracking-wider text-gray-500">
                4 · Payout Journey
              </h2>
              <span className="text-[10px] text-gray-600">
                a payout unlocks every {minQualifyingDays} winning days
              </span>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[420px] space-y-1 text-sm">
                <div className="flex gap-2 px-2 text-[10px] uppercase tracking-wider text-gray-600">
                  <span className="flex-1">Payout</span>
                  <span className="w-16 text-right">Earliest</span>
                  <span className="w-28 text-right">Withdraw</span>
                  <span className="w-28 text-right">Left in Account</span>
                  <span className="w-24 text-right">You Get</span>
                </div>
                {payout.payoutEvents.map((ev) => (
                  <div
                    key={ev.index}
                    className="flex items-baseline gap-2 rounded px-2 py-1">
                    <span className="flex-1 text-gray-300">
                      Payout {ev.index}
                    </span>
                    <span
                      className={`w-16 whitespace-nowrap text-right tabular-nums ${
                        ev.beyondMonth ? "text-red-400" : "text-gray-500"
                      }`}>
                      day {ev.day}
                    </span>
                    <span className="w-28 whitespace-nowrap text-right tabular-nums text-gray-400">
                      {payout.accountsNeeded} × {eur0(ev.perAccountProfit)}
                    </span>
                    <span className="w-28 whitespace-nowrap text-right tabular-nums text-gray-400">
                      {eur0(ev.balanceAfter)}
                    </span>
                    <span className="w-24 whitespace-nowrap text-right tabular-nums text-green-400">
                      {eur0(ev.cash)}
                    </span>
                  </div>
                ))}
                <div className="flex items-baseline gap-2 border-t border-gray-800 px-2 pt-2 font-semibold">
                  <span className="flex-1 text-gray-300">Total</span>
                  <span className="w-24 whitespace-nowrap text-right tabular-nums text-green-400 sm:ml-auto">
                    {eur0(payout.totalCash)}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-gray-600">
              Earliest days assume every session earns {eur0(payout.dailyPace)}{" "}
              and counts as a winning day. "Left in account" is one account's
              balance right after the request — the {eur0(
                parseFloat(bufferPerAccount) || 0,
              )}{" "}
              buffer stays untouched. All {payout.accountsNeeded} accounts
              request together.
              {payout.payoutEvents.some((ev) => ev.beyondMonth) &&
                " Red days fall outside your planned trading days — raise the pace or the day count."}
            </p>
          </section>
        )}

        {payout.status === "ok" && (
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xs uppercase tracking-wider text-gray-500">
                5 · Rule Check
              </h2>
              <span
                className={`text-[10px] ${
                  payout.checks.valid ? "text-green-400" : "text-red-400"
                }`}>
                {payout.checks.valid
                  ? "every firm rule passes"
                  : "the plan breaks the firm's rules"}
              </span>
            </div>
            <div className="space-y-2">
              <CheckRow
                ok={payout.checks.daysOk}
                label="Winning Days"
                detail={`${calculations.tradingDaysPerMonth} planned · ${payout.checks.requiredDays} needed for ${payout.cyclesUsed} payout${payout.cyclesUsed === 1 ? "" : "s"}`}
              />
              <CheckRow
                ok={payout.checks.daySizeOk}
                label="Day Size"
                detail={
                  payout.checks.daySizeOk
                    ? `${eur0(payout.dailyPace)} daily target ≥ ${eur0(parseFloat(minProfitPerDay) || 0)} to count as a win`
                    : `${eur0(payout.dailyPace)} daily target < ${eur0(parseFloat(minProfitPerDay) || 0)} — aim for ${payout.checks.greenDaysNeeded} days of ≥ ${eur0(parseFloat(minProfitPerDay) || 0)}`
                }
              />
              <CheckRow
                ok={payout.checks.capOk}
                label="Payout Cap"
                detail={`${payout.accountsNeeded} account${payout.accountsNeeded === 1 ? "" : "s"} can release ${eur0(payout.maxCash)} · ${eur0(payout.incomeTarget)} needed`}
              />
              {payout.paceForced && (
                <CheckRow
                  ok={payout.checks.paceOk}
                  label="Your Pace"
                  detail={
                    payout.checks.paceOk
                      ? `${eur0(payout.dailyPace)}/day × ${calculations.tradingDaysPerMonth} days covers the ${eur0(payout.perAccountEarnBuild)} each account must earn`
                      : `${eur0(payout.dailyPace)}/day × ${calculations.tradingDaysPerMonth} days = ${eur0(payout.dailyPace * calculations.tradingDaysPerMonth)} · ${eur0(payout.perAccountEarnBuild)} needed per account`
                  }
                />
              )}
              {riskBand && (
                <CheckRow
                  ok={null}
                  label="Risk"
                  detail={`${eur0(payout.dailyPace)}/day is ${payout.dailyRiskPct.toFixed(2)}% of the account · ${riskBand.label}`}
                />
              )}
            </div>
          </section>
        )}

        {payout.status === "ok" && payout.scenarios.length > 1 && (
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xs uppercase tracking-wider text-gray-500">
                6 · Fewer vs More Accounts
              </h2>
              <span className="text-[10px] text-gray-600">
                tap a card to re-plan the journey
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {payout.scenarios.map((s) => {
                const isActive = s.accounts === payout.accountsNeeded;
                const isRecommended =
                  s.accounts === payout.recommendedAccounts;
                const blocked = s.shortfall > 0;
                const reason = blocked
                  ? `Cap stops at ${eur0(s.maxCash)} — ${eur0(s.shortfall)} short of ${eur0(payout.incomeTarget)}`
                  : isRecommended
                    ? `Reaches ${eur0(payout.incomeTarget)} with the fewest accounts`
                    : `Reaches ${eur0(payout.incomeTarget)} with lighter days`;
                return (
                  <button
                    key={s.accounts}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() =>
                      setAccountsOverride(isRecommended ? null : s.accounts)
                    }
                    className={`rounded-lg border p-3 text-center transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-gray-500 ${
                      isActive
                        ? "border-green-500/40 bg-green-500/10"
                        : "border-gray-800 bg-gray-950/40 hover:border-gray-700"
                    } ${blocked && !isActive ? "opacity-80" : ""}`}>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">
                      {s.accounts} account{s.accounts === 1 ? "" : "s"}
                      {isRecommended ? " · recommended" : ""}
                    </div>
                    <div className="mt-1 text-lg font-bold tabular-nums text-gray-100">
                      {eur0(s.perAccountDaily)}
                      <span className="ml-1 text-[10px] font-normal text-gray-500">
                        /day each
                      </span>
                    </div>
                    <div
                      className={`mt-1 text-[11px] leading-snug ${
                        blocked
                          ? "text-red-400"
                          : isActive
                            ? "text-green-400"
                            : "text-gray-500"
                      }`}>
                      {reason}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs uppercase tracking-wider text-gray-500">
              7 · Income Overview
            </h2>
            <span className="text-[10px] text-gray-600">
              net = after {calculations.effectiveTaxRate.toFixed(0)}% German
              tax · hourly {eur0(calculations.hourlyRate)} over{" "}
              {hoursPerDay || 1}h
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex gap-2 px-2 text-[10px] uppercase tracking-wider text-gray-600">
              <span className="flex-1">Timeframe</span>
              <span className="w-28 text-right">Gross (pre-tax)</span>
              <span className="w-28 text-right">Net (after tax)</span>
            </div>
            {(
              [
                {
                  label: `Per trading day (×${calculations.tradingDaysPerMonth})`,
                  gross: calculations.daily,
                  net:
                    calculations.tradingDaysPerMonth > 0
                      ? calculations.netMonthly /
                        calculations.tradingDaysPerMonth
                      : 0,
                  highlight: false,
                },
                {
                  label: "Per week",
                  gross: calculations.weekly,
                  net: calculations.netAnnual / 52,
                  highlight: false,
                },
                {
                  label: "Per month",
                  gross: calculations.monthly,
                  net: calculations.netMonthly,
                  highlight: true,
                },
                {
                  label: "Per year",
                  gross: calculations.annual,
                  net: calculations.netAnnual,
                  highlight: false,
                },
              ] as const
            ).map((row) => (
              <div
                key={row.label}
                className={`flex items-baseline gap-2 rounded px-2 py-1 ${
                  row.highlight
                    ? "border border-green-500/30 bg-green-500/10 font-semibold"
                    : ""
                }`}>
                <span
                  className={`flex-1 ${
                    row.highlight ? "text-gray-200" : "text-gray-500"
                  }`}>
                  {row.label}
                </span>
                <span
                  className={`w-28 whitespace-nowrap text-right tabular-nums ${
                    row.highlight ? "text-white" : "text-gray-300"
                  }`}>
                  {eur(row.gross)}
                </span>
                <span className="w-28 whitespace-nowrap text-right tabular-nums text-green-400">
                  {eur(row.net)}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs uppercase tracking-wider text-gray-500">
              8 · Germany Tax 2026
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                value={employmentMode}
                onChange={setEmploymentMode}
                options={[
                  {
                    value: "freelancer",
                    label: "Freelance",
                    active: "bg-gray-700 text-gray-100",
                  },
                  {
                    value: "employed",
                    label: "Employed",
                    active: "bg-gray-700 text-gray-100",
                  },
                ]}
              />
              <Segmented
                value={isMarried ? "married" : "single"}
                onChange={(v) => setIsMarried(v === "married")}
                options={[
                  {
                    value: "single",
                    label: "Single",
                    active: "bg-gray-700 text-gray-100",
                  },
                  {
                    value: "married",
                    label: "Married",
                    active: "bg-gray-700 text-gray-100",
                  },
                ]}
              />
              <label className="flex cursor-pointer items-center gap-2">
                <span className="text-xs text-gray-500">Church</span>
                <div
                  onClick={() => setHasChurchTax(!hasChurchTax)}
                  className={`h-4 w-8 rounded-full transition-colors ${
                    hasChurchTax ? "bg-green-500" : "bg-gray-700"
                  }`}>
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform ${
                      hasChurchTax ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span className="text-gray-500">
              Gross {eur(calculations.monthly)} monthly ·{" "}
              {eur(calculations.annual)} yearly
            </span>
            <span className="text-gray-400">
              {calculations.effectiveTaxRate.toFixed(1)}% to the state
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex gap-2 text-[10px] uppercase tracking-wider text-gray-600">
              <span className="flex-1">Taxes {isMarried && "(splitting)"}</span>
              <span className="w-24 text-right">Annual</span>
              <span className="w-20 text-right">Monthly</span>
            </div>
            <DeductionRow
              label="Income Tax"
              annual={calculations.incomeTax}
              monthly={calculations.monthlyIncomeTax}
              format={formatNumber}
            />
            {calculations.solidaritySurcharge > 0 && (
              <DeductionRow
                label="Solidarity"
                annual={calculations.solidaritySurcharge}
                monthly={calculations.monthlySolidaritySurcharge}
                format={formatNumber}
              />
            )}
            {calculations.churchTax > 0 && (
              <DeductionRow
                label="Church Tax"
                annual={calculations.churchTax}
                monthly={calculations.monthlyChurchTax}
                format={formatNumber}
              />
            )}

            <div className="flex gap-2 pt-2 text-[10px] uppercase tracking-wider text-gray-600">
              <span className="flex-1">
                Social {employmentMode === "employed" && "(your 50%)"}
              </span>
              <span className="w-24 text-right">Annual</span>
              <span className="w-20 text-right">Monthly</span>
            </div>
            <DeductionRow
              label="Health"
              annual={calculations.annualHealthInsurance}
              monthly={calculations.monthlyHealthInsurance}
              format={formatNumber}
            />
            <DeductionRow
              label="Care"
              annual={calculations.annualCareInsurance}
              monthly={calculations.monthlyCareInsurance}
              format={formatNumber}
            />
            {employmentMode === "employed" && (
              <>
                <DeductionRow
                  label="Pension"
                  annual={calculations.annualPensionInsurance}
                  monthly={calculations.monthlyPensionInsurance}
                  format={formatNumber}
                />
                <DeductionRow
                  label="Unemployment"
                  annual={calculations.annualUnemploymentInsurance}
                  monthly={calculations.monthlyUnemploymentInsurance}
                  format={formatNumber}
                />
              </>
            )}
            <DeductionRow
              label="Total Deductions"
              annual={calculations.totalDeductions}
              monthly={calculations.monthlyTotalDeductions}
              format={formatNumber}
              strong
            />

            <div className="flex items-baseline gap-2 border-t border-gray-700 pt-2 font-semibold text-green-400">
              <span className="flex-1">Net take-home</span>
              <span className="w-24 whitespace-nowrap text-right tabular-nums">
                {eur(calculations.netAnnual)}
              </span>
              <span className="w-20 whitespace-nowrap text-right tabular-nums">
                {eur(calculations.netMonthly)}
              </span>
            </div>
          </div>
        </section>
        <CollapsibleSection title="Disposable after expenses">
          <label className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">
              Monthly Expenses
            </span>
            <span className="relative">
              <input
                type="number"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(e.target.value)}
                className="number-input w-28 rounded border border-gray-800 bg-gray-950 px-3 py-1.5 pr-6 text-center text-sm font-semibold text-white focus:border-gray-600 focus:outline-none"
              />
              {monthlyExpenses !== "" && (
                <button
                  type="button"
                  aria-label="Clear Monthly Expenses"
                  onClick={(e) => {
                    e.preventDefault();
                    setMonthlyExpenses("");
                  }}
                  className="absolute inset-y-0 right-1.5 flex items-center px-0.5 text-gray-600 hover:text-gray-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-gray-500">
                  <span aria-hidden="true" className="text-sm leading-none">
                    ×
                  </span>
                </button>
              )}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Monthly"
              value={eur(calculations.disposableMonthly)}
              accent={
                calculations.disposableMonthly >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }
            />
            <StatCard
              label="Annual Savings"
              value={eur(calculations.disposableAnnual)}
              accent={
                calculations.disposableAnnual >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Other income levels">
          <div className="space-y-1 text-sm">
            <div className="flex gap-2 px-2 text-[10px] uppercase tracking-wider text-gray-600">
              <span className="hidden flex-1 sm:inline">Gross/yr</span>
              <span className="flex-1 text-right">Gross/mo</span>
              <span className="flex-1 text-right">Net/mo</span>
              <span className="w-16 text-right">Δ/mo</span>
              <span className="w-10 text-right">Rate</span>
            </div>
            {visibleLevels.map(({ level, idx, prevVisibleNet }) => {
              const isCurrent = level.grossMonthly === calculations.monthly;
              const diff =
                prevVisibleNet !== null
                  ? level.netMonthly - prevVisibleNet
                  : null;
              const base = isCurrent
                ? "text-green-400 font-semibold"
                : "text-gray-500";
              return (
                <div
                  key={idx}
                  className={`flex gap-2 rounded px-2 py-1 ${
                    isCurrent
                      ? "border border-green-500/30 bg-green-500/10"
                      : ""
                  }`}>
                  <span
                    className={`hidden flex-1 tabular-nums sm:inline ${base}`}>
                    {eur(level.grossAnnual)}
                  </span>
                  <span className={`flex-1 text-right tabular-nums ${base}`}>
                    {eur(level.grossMonthly)}
                  </span>
                  <span
                    className={`flex-1 text-right tabular-nums ${
                      isCurrent
                        ? "text-green-400 font-semibold"
                        : "text-gray-300"
                    }`}>
                    {eur(level.netMonthly)}
                  </span>
                  <span
                    className={`w-16 text-right tabular-nums ${
                      isCurrent ? "text-green-400" : "text-gray-500"
                    }`}>
                    {diff !== null ? `+${formatNumber(diff)}` : "—"}
                  </span>
                  <span className={`w-10 text-right tabular-nums ${base}`}>
                    {level.rate.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
          {comparisonLevels.length > 3 && (
            <button
              onClick={() => setShowAllLevels((v) => !v)}
              aria-expanded={showAllLevels}
              className="mt-2 w-full rounded px-2 py-1.5 text-[11px] text-gray-500 transition-colors hover:bg-gray-800/50 hover:text-gray-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-gray-600">
              {showAllLevels
                ? "Show fewer"
                : `Show all ${comparisonLevels.length} levels`}
            </button>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Employee vs Freelancer">
          <p className="text-xs leading-relaxed text-gray-500">
            Same take-home of{" "}
            <span className="font-semibold text-green-400">
              {eur(ec.targetNetMonthly)}/mo
            </span>{" "}
            — two ways to earn it:
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-gray-800 p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">
                As an employee
              </div>
              <div className="mt-1 text-lg font-bold tabular-nums text-gray-100">
                {eur(ec.employeeGross / 12)}
                <span className="ml-1 text-xs font-normal text-gray-500">
                  /mo gross
                </span>
              </div>
              <div className="text-[11px] text-gray-500">
                {eur(ec.employeeGross)}/yr salary
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                Costs employer {eur(ec.employerCost / 12)}/mo
              </div>
            </div>
            <div className="rounded border border-gray-800 p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">
                As a freelancer
              </div>
              <div className="mt-1 text-lg font-bold tabular-nums text-gray-100">
                {eur(ec.freelancerMatchNet / 12)}
                <span className="ml-1 text-xs font-normal text-gray-500">
                  /mo profit
                </span>
              </div>
              <div className="text-[11px] text-gray-500">
                {eur(ec.freelancerMatchNet)}/yr invoiced
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                Set aside {eur(ec.reserve / 12)}/mo (tax + health)
              </div>
            </div>
          </div>
        </CollapsibleSection>
    </>
  );
}
