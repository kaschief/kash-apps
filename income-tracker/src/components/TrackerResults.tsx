import { useState } from "react";
import type { IncomeTrackerModel } from "../hooks/useIncomeTracker";
import { makeMoney, plural } from "../lib/format";
import {
  CheckRow,
  CollapsibleSection,
  DeductionRow,
  normalizeNumberInput,
  PlanStat,
  Segmented,
  StatCard,
} from "./ui";

export function TrackerResults({ model }: { model: IncomeTrackerModel }) {
  const {
    payout,
    calculations,
    minQualifyingDays,
    minProfitPerDay,
    minCycleProfit,
    profitReleasePct,
    bufferPerAccount,
    riskBand,
    setAccountsOverride,
    setDailyPaceInput,
    fastPaceForAccounts,
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
    ec,
    currency,
    eurUsdRate,
  } = model;
  const {
    symbol,
    money: eur,
    money0: eur0,
    usd0,
    fromUsd,
    format: formatNumber,
  } = makeMoney(currency, eurUsdRate);
  // Payout Journey can be read per single account or across every account.
  const [journeyView, setJourneyView] = useState<"account" | "all">("account");
  // Effort-by-approach comparison is opt-in to keep section 6 uncluttered.
  const [showEffort, setShowEffort] = useState(false);
  // The fewest-calendar-days scenario: smallest completion day, tie-broken by
  // fewest accounts. It's just one of the listed scenarios, badged "fastest".
  const fastestAccounts =
    payout.status === "ok"
      ? payout.scenarios
          .filter((s) => s.shortfall === 0)
          .reduce<number | null>((best, s) => {
            if (best === null) return s.accounts;
            const bestScenario = payout.scenarios.find(
              (x) => x.accounts === best,
            );
            if (!bestScenario) return s.accounts;
            return s.completionDay < bestScenario.completionDay
              ? s.accounts
              : best;
          }, null)
      : null;
  const planAccent =
    payout.status === "ok" && payout.checks.valid
      ? "text-green-400"
      : "text-red-400";

  return (
    <>
      <CollapsibleSection
        title="3 · The Plan"
        defaultOpen
        action={
          payout.status === "ok" ? (
            <span className="whitespace-nowrap text-[10px] normal-case tracking-normal text-gray-500 group-open:hidden">
              <span className={planAccent}>
                {payout.accountsNeeded} {plural(payout.accountsNeeded, "account")}
              </span>{" "}
              · <span className="text-amber-300">
                aim {usd0(payout.perAccountEarnBuild)}
              </span>{" "}
              · <span className={planAccent}>{usd0(payout.dailyPace)}/day</span>{" "}
              ·{" "}
              <span className={planAccent}>
                {eur0(fromUsd(payout.totalCash))}/gross
              </span>
            </span>
          ) : null
        }
        className={
          payout.status === "ok" && payout.checks.valid
            ? "border-green-500/25 bg-green-500/[0.05]"
            : "border-red-500/25 bg-red-500/[0.04]"
        }>
        <div className="mb-4 flex items-center justify-end">
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
                  ? `${usd0(payout.shortfall)} short of target`
                  : "Breaks firm rules"}
            </span>
          )}
        </div>

        {payout.status === "ok" ? (
          <>
            <div className="grid grid-cols-2 gap-y-4 divide-gray-700/60 sm:grid-cols-5 sm:gap-y-0 sm:divide-x">
              <PlanStat
                label="Accounts"
                valueClass={planAccent}
                value={payout.accountsNeeded}
                sub={
                  payout.accountsForced
                    ? `your choice · ${payout.recommendedAccounts} recommended`
                    : "copy-traded as one"
                }
              />
              <PlanStat
                highlight
                label="Each Account Earns ★"
                value={usd0(payout.perAccountEarnBuild)}
                valueClass="text-amber-300"
                sub="your monthly target"
              />
              <PlanStat
                label="Daily Target"
                value={usd0(payout.dailyPace)}
                sub={
                  payout.paceForced
                    ? `your pace · plan needs ${usd0(payout.dailyNeeded)}`
                    : `per account · ${calculations.tradingDaysPerMonth} days`
                }
              />
              <PlanStat
                label={`You Receive (${currency})`}
                valueClass={planAccent}
                value={eur0(fromUsd(payout.totalCash))}
                sub={
                  payout.shortfall > 0
                    ? `of the ${eur0(fromUsd(payout.incomeTarget))} target`
                    : `over ${payout.cyclesUsed} ${plural(payout.cyclesUsed, "payout")}`
                }
              />
              <PlanStat
                label="Net Take-home"
                valueClass={planAccent}
                value={eur0(calculations.netMonthly)}
                sub="after German deductions"
              />
            </div>

            {(parseFloat(bufferPerAccount) || 0) > 0 && (
              <p className="mt-4 border-t border-gray-700/60 pt-3 text-center text-[11px] text-gray-500">
                The buffer is earned once. From next month{" "}
                {usd0(payout.perAccountEarnSteady)} cycle profit per account is
                enough — {usd0(payout.perAccountDailySteady)}/day.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Enter an income target and a profit split to see the plan.
          </p>
        )}
      </CollapsibleSection>

      {payout.status === "ok" && (
        <CollapsibleSection
          title="4 · Payout Journey"
          defaultOpen
          action={
            <span className="whitespace-nowrap text-[10px] normal-case tracking-normal text-gray-500 group-open:hidden">
              {payout.cyclesUsed} {plural(payout.cyclesUsed, "payout")} ·{" "}
              <span className={planAccent}>
                {eur0(fromUsd(payout.totalCash))} received
              </span>
              {payout.shortfall > 0 && (
                <span className="text-red-400">
                  {" "}
                  · {eur0(fromUsd(payout.shortfall))} short
                </span>
              )}
            </span>
          }>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            {payout.accountsNeeded > 1 ? (
              <Segmented
                value={journeyView}
                onChange={setJourneyView}
                options={[
                  {
                    value: "account",
                    label: "Per account",
                    active: "bg-gray-700 text-gray-100",
                  },
                  {
                    value: "all",
                    label: `All ${payout.accountsNeeded} accounts`,
                    active: "bg-gray-700 text-gray-100",
                  },
                ]}
              />
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-gray-500">
                Single account
              </span>
            )}
            <span className="text-[10px] text-gray-600">
              a payout unlocks every {minQualifyingDays} winning days
            </span>
          </div>
          {!payout.checks.valid && (
            <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/[0.07] px-3 py-2 text-[11px] leading-relaxed text-red-300">
              <span className="font-semibold">
                This plan doesn't fully reach your target yet.
              </span>{" "}
              {payout.shortfall > 0
                ? `These payouts deliver ${eur0(fromUsd(payout.totalCash))} of your ${eur0(fromUsd(payout.incomeTarget))} goal — ${eur0(fromUsd(payout.shortfall))} short. ${payout.accountsNeeded} ${plural(payout.accountsNeeded, "account")} can release at most ${eur0(fromUsd(payout.maxCash))}; add accounts (section 6) or raise the payout cap.`
                : "It breaks a firm rule — see Rule Check below for which one and how to fix it."}
            </div>
          )}
          {(() => {
            // Visual accounting: where each account's monthly earnings go.
            const earn = payout.perAccountEarnBuild;
            const youKeep = payout.totalCash / payout.accountsNeeded;
            const firm = payout.perAccountWithdraw - youKeep;
            const buffer = parseFloat(bufferPerAccount) || 0;
            const locked = Math.max(
              0,
              earn - payout.perAccountWithdraw - buffer,
            );
            const segments = [
              {
                label: "You keep",
                value: youKeep,
                bar: "bg-green-400",
                dot: "bg-green-400",
                sub: "withdrawn, your split",
              },
              {
                label: "Firm split",
                value: firm,
                bar: "bg-gray-500",
                dot: "bg-gray-500",
                sub:
                  payout.perAccountWithdraw > 0
                    ? `withdrawn, ${Math.round((firm / payout.perAccountWithdraw) * 100)}%`
                    : "withdrawn",
              },
              {
                label: "Locked in",
                value: locked,
                bar: "bg-amber-400/70",
                dot: "bg-amber-400/70",
                sub: `held by ${profitReleasePct}% release`,
              },
              {
                label: "Buffer",
                value: buffer,
                bar: "bg-sky-400/60",
                dot: "bg-sky-400/60",
                sub: "cushion, never withdrawn",
              },
            ].filter((s) => s.value > 1);
            return (
              <div className="mb-4 rounded-md bg-amber-400/[0.06] px-3 py-3 ring-1 ring-inset ring-amber-400/25">
                <div className="mb-2 flex flex-wrap items-baseline justify-center gap-x-2 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-amber-300/90">
                    Aim for
                  </span>
                  <span className="text-lg font-bold tabular-nums text-amber-300">
                    {usd0(earn)}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    earned per account this month — here's where it goes:
                  </span>
                </div>
                <div className="flex h-4 w-full overflow-hidden rounded">
                  {segments.map((s) => (
                    <div
                      key={s.label}
                      className={`h-full ${s.bar}`}
                      style={{ width: `${(s.value / earn) * 100}%` }}
                      title={`${s.label}: ${usd0(s.value)}`}
                    />
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
                  {segments.map((s) => (
                    <div key={s.label} className="flex items-start gap-1.5">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-sm ${s.dot}`}
                      />
                      <span className="leading-tight">
                        <span className="block text-xs font-semibold tabular-nums text-gray-200">
                          {usd0(s.value)}
                        </span>
                        <span className="block text-[10px] text-gray-500">
                          {s.label} · {s.sub}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 border-t border-amber-400/10 pt-2 text-[10px] leading-relaxed text-gray-500">
                  Only{" "}
                  <span className="text-gray-300">
                    {usd0(payout.perAccountWithdraw)}
                  </span>{" "}
                  of the {usd0(earn)} comes out (you keep{" "}
                  <span className="text-green-400">{usd0(youKeep)}</span>); the
                  rest stays in the account.
                </div>
              </div>
            );
          })()}
          {(() => {
            // Every money column is scaled to the same basis (one account, or
            // all of them) and shown in USD — the firm's currency, matching the
            // account balances and the payout cap — so the row reconciles:
            // withdrawn = firm keeps + you get.
            const accounts = payout.accountsNeeded;
            // A single account has no "all vs per" distinction — force per-account.
            const allView = accounts > 1 && journeyView === "all";
            const factor = allView ? accounts : 1;
            const scope = allView ? `all ${accounts}` : "one";
            const bufferPerAcct = parseFloat(bufferPerAccount) || 0;
            const bufferScoped = bufferPerAcct * factor;
            return (
              <>
                <div className="overflow-x-auto">
                  <div className="min-w-[660px] space-y-1 text-sm">
                    <div className="flex gap-2 px-2 text-[10px] uppercase tracking-wider text-gray-600">
                      <span className="w-24">Payout</span>
                      <span className="flex-1 text-right">
                        Balance ({allView ? scope : "1 acct"})
                      </span>
                      <span className="w-24 text-right">Withdrawn</span>
                      <span className="w-24 text-right">Firm keeps</span>
                      <span className="w-24 text-right">You get</span>
                    </div>
                    {payout.payoutEvents.map((ev) => {
                      // ev.cash is your cash across all accounts; per-account is
                      // ev.cash / accounts. Balances are scaled to the same basis
                      // as the money columns so a row reconciles: the balance
                      // drop equals Withdrawn.
                      const withdrawn = ev.perAccountProfit * factor;
                      const youGet = (ev.cash / accounts) * factor;
                      const firmKeeps = withdrawn - youGet;
                      const balanceAfter = ev.balanceAfter * factor;
                      const balanceBefore =
                        (ev.balanceAfter + ev.perAccountProfit) * factor;
                      return (
                        <div
                          key={ev.index}
                          className="flex items-baseline gap-2 rounded px-2 py-1">
                          <span className="flex w-24 shrink-0 flex-col leading-tight">
                            <span className="text-gray-300">
                              Payout {ev.index}
                            </span>
                            <span
                              className={`text-[10px] ${
                                ev.beyondMonth
                                  ? "text-red-400"
                                  : "text-gray-600"
                              }`}>
                              day {ev.day}
                            </span>
                          </span>
                          <span className="flex-1 whitespace-nowrap text-right tabular-nums text-gray-400">
                            {usd0(balanceBefore)}{" "}
                            <span className="text-gray-600">→</span>{" "}
                            <span className="text-gray-300">
                              {usd0(balanceAfter)}
                            </span>
                          </span>
                          <span className="w-24 whitespace-nowrap text-right tabular-nums text-gray-300">
                            {usd0(withdrawn)}
                          </span>
                          <span className="w-24 whitespace-nowrap text-right tabular-nums text-gray-500">
                            {usd0(firmKeeps)}
                          </span>
                          <span
                            className={`w-24 whitespace-nowrap text-right tabular-nums ${planAccent}`}>
                            {usd0(youGet)}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex items-baseline gap-2 border-t border-gray-800 px-2 pt-2 font-semibold">
                      <span className="w-24 shrink-0 text-gray-300">
                        Total
                        {!allView && accounts > 1 ? " / account" : ""}
                      </span>
                      <span className="flex-1" />
                      <span className="w-24 whitespace-nowrap text-right tabular-nums text-gray-300">
                        {usd0((payout.withdrawProfit / accounts) * factor)}
                      </span>
                      <span className="w-24 whitespace-nowrap text-right tabular-nums text-gray-500">
                        {usd0(
                          ((payout.withdrawProfit - payout.totalCash) /
                            accounts) *
                            factor,
                        )}
                      </span>
                      <span
                        className={`w-24 whitespace-nowrap text-right tabular-nums ${planAccent}`}>
                        {usd0((payout.totalCash / accounts) * factor)}
                      </span>
                    </div>
                    {!allView && accounts > 1 && (
                      // Make the per-account numbers visibly multiply up to the
                      // real money received across every account.
                      <div className="flex items-baseline gap-2 px-2 pt-1 text-[11px] font-semibold">
                        <span className="flex-1 text-gray-500">
                          × {accounts} accounts
                        </span>
                        <span className="w-24 whitespace-nowrap text-right tabular-nums text-gray-400">
                          {usd0(payout.withdrawProfit)}
                        </span>
                        <span className="w-24 whitespace-nowrap text-right tabular-nums text-gray-500">
                          {usd0(payout.withdrawProfit - payout.totalCash)}
                        </span>
                        <span
                          className={`w-24 whitespace-nowrap text-right tabular-nums ${planAccent}`}>
                          {usd0(payout.totalCash)}
                        </span>
                      </div>
                    )}
                    {bufferScoped > 0 && (
                      <div className="flex items-baseline gap-2 px-2 pt-1 text-[11px]">
                        <span className="flex-1 text-gray-500">
                          Buffer kept in {scope} account
                          {scope === "one" ? "" : "s"} (never withdrawn)
                        </span>
                        <span className="whitespace-nowrap tabular-nums text-gray-400">
                          {usd0(bufferScoped)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-gray-600">
                  Figures shown for <span className="text-gray-400">{scope}</span>{" "}
                  account{scope === "one" ? "" : "s"}, in USD. Every column is on
                  the same basis, so the balance drop equals{" "}
                  <span className="text-gray-400">Withdrawn</span>, and withdrawn
                  = firm keeps + you get. Your {usd0(payout.totalCash)} total ≈{" "}
                  <span className={planAccent}>
                    {eur0(fromUsd(payout.totalCash))}
                  </span>{" "}
                  in your currency.{" "}
                  <span className="text-gray-400">Earned vs. withdrawn:</span>{" "}
                  the balance climbs between payouts because you earn more than
                  you pull — the {profitReleasePct}% release rule leaves the
                  unreleased profit in the account
                  {bufferScoped > 0 && (
                    <>
                      , on top of the {usd0(bufferScoped)} buffer that stays put
                    </>
                  )}
                  . Balances assume every session earns {usd0(payout.dailyPace)}.
                  {payout.payoutEvents.some((ev) => ev.beyondMonth) &&
                    " Red days fall outside your planned trading days — raise the pace or the day count."}
                </p>
              </>
            );
          })()}
        </CollapsibleSection>
      )}

      {payout.status === "ok" && (
        <CollapsibleSection
          title="5 · Rule Check"
          defaultOpen
          action={
            <span
              className={`whitespace-nowrap text-[10px] normal-case tracking-normal group-open:hidden ${payout.checks.valid ? "text-green-400" : "text-red-400"}`}>
              {payout.checks.valid ? "All rules pass" : "Rules need attention"}
            </span>
          }>
          <div className="mb-3 flex flex-wrap items-baseline justify-end gap-2">
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
              detail={`${calculations.tradingDaysPerMonth} planned · ${payout.checks.requiredDays} needed for ${payout.cyclesUsed} ${plural(payout.cyclesUsed, "payout")}`}
            />
            <CheckRow
              ok={payout.checks.daySizeOk}
              label="Day Size"
              detail={
                payout.checks.daySizeOk
                  ? `${usd0(payout.dailyPace)} daily target ≥ ${usd0(parseFloat(minProfitPerDay) || 0)} to count as a win`
                  : `${usd0(payout.dailyPace)} daily target < ${usd0(parseFloat(minProfitPerDay) || 0)} — aim for ${payout.checks.greenDaysNeeded} days of ≥ ${usd0(parseFloat(minProfitPerDay) || 0)}`
              }
            />
            <CheckRow
              ok={payout.checks.capOk}
              label="Payout Cap"
              detail={`${payout.accountsNeeded} ${plural(payout.accountsNeeded, "account")} can release ${usd0(payout.maxCash)} · ${usd0(payout.incomeTarget)} needed`}
            />
            <CheckRow
              ok={payout.checks.cycleProfitOk}
              label="Cycle Profit"
              detail={`${profitReleasePct}% available · at least ${usd0(parseFloat(minCycleProfit) || 0)} net profit required between requests`}
            />
            {payout.paceForced && (
              <CheckRow
                ok={payout.checks.paceOk}
                label="Your Pace"
                detail={
                  payout.checks.paceOk
                    ? `${usd0(payout.dailyPace)}/day × ${calculations.tradingDaysPerMonth} days covers the ${usd0(payout.perAccountEarnBuild)} each account must earn`
                    : `${usd0(payout.dailyPace)}/day × ${calculations.tradingDaysPerMonth} days = ${usd0(payout.dailyPace * calculations.tradingDaysPerMonth)} · ${usd0(payout.perAccountEarnBuild)} needed per account`
                }
              />
            )}
            {riskBand && (
              <CheckRow
                ok={null}
                label="Risk"
                detail={`${usd0(payout.dailyPace)}/day is ${payout.dailyRiskPct.toFixed(2)}% of the account · ${riskBand.label}`}
              />
            )}
          </div>
        </CollapsibleSection>
      )}

      {payout.status === "ok" && payout.scenarios.length > 1 && (
        <CollapsibleSection
          title="6 · Fewer vs More Accounts"
          defaultOpen
          action={
            <span className="whitespace-nowrap text-[10px] normal-case tracking-normal text-gray-500 group-open:hidden">
              <span className="text-green-400">
                {payout.accountsNeeded} selected
              </span>{" "}
              · {payout.recommendedAccounts} recommended
            </span>
          }>
          {(() => {
            // Dial account count directly; each step applies that count's
            // fastest pace so days, daily target and risk update live.
            const applyAccounts = (n: number) => {
              const target = Math.max(1, n);
              const projection = fastPaceForAccounts(target);
              setAccountsOverride(
                target === payout.recommendedAccounts ? null : target,
              );
              if (projection) setDailyPaceInput(String(projection.dailyTarget));
            };
            const current = payout.accountsNeeded;
            const days = payout.payoutEvents.length
              ? Math.max(...payout.payoutEvents.map((e) => e.day))
              : 0;
            const btn =
              "flex h-8 w-8 items-center justify-center rounded border border-gray-700 bg-gray-900 text-lg leading-none text-gray-300 transition-colors hover:border-green-500/40 hover:text-green-400 focus-visible:outline focus-visible:outline-1 focus-visible:outline-green-500 disabled:opacity-30 disabled:hover:border-gray-700 disabled:hover:text-gray-300";
            return (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-gray-800 bg-gray-950/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">
                    Accounts
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyAccounts(current - 1)}
                      disabled={current <= 1}
                      aria-label="Fewer accounts"
                      className={btn}>
                      −
                    </button>
                    <span className="w-8 text-center text-xl font-bold tabular-nums text-gray-100">
                      {current}
                    </span>
                    <button
                      type="button"
                      onClick={() => applyAccounts(current + 1)}
                      aria-label="More accounts"
                      className={btn}>
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-400">
                  <span>
                    Pay in{" "}
                    <strong className="tabular-nums text-gray-100">
                      {days} {plural(days, "day")}
                    </strong>
                  </span>
                  <span>
                    <strong className="tabular-nums text-gray-100">
                      {usd0(payout.dailyPace)}
                    </strong>
                    /day each
                  </span>
                  {riskBand && (
                    <span className="text-gray-500">{riskBand.label} risk</span>
                  )}
                  <span className="text-gray-600">
                    fewer = cheaper · more = lighter &amp; lower risk
                  </span>
                </div>
              </div>
            );
          })()}
          <div className="mb-3 flex flex-wrap items-baseline justify-end gap-2">
            <span className="text-[10px] text-gray-600">
              or tap a preset below to re-plan the journey
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {payout.scenarios.map((s) => {
              const isActive = s.accounts === payout.accountsNeeded;
              const isRecommended = s.accounts === payout.recommendedAccounts;
              const isFastest = s.accounts === fastestAccounts;
              const blocked = s.shortfall > 0;
              const tag = isRecommended
                ? " · recommended"
                : isFastest
                  ? " · fastest"
                  : "";
              const reason = blocked
                ? `Cap stops at ${usd0(s.maxCash)} — ${usd0(s.shortfall)} short of ${usd0(payout.incomeTarget)}`
                : isFastest
                  ? `Whole target out by day ${s.completionDay} — the fewest days`
                  : isRecommended
                    ? `Reaches ${usd0(payout.incomeTarget)} with the fewest accounts`
                    : `Out by day ${s.completionDay} at a lighter daily pace`;
              return (
                <button
                  key={s.accounts}
                  type="button"
                  aria-pressed={isActive}
                  // Selecting a card applies its account count AND its fast pace,
                  // so each card is "the fastest way to run N accounts".
                  onClick={() => {
                    setAccountsOverride(isRecommended ? null : s.accounts);
                    setDailyPaceInput(blocked ? "" : String(s.fastDaily));
                  }}
                  className={`rounded-lg border p-3 text-center transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-gray-500 ${
                    isActive
                      ? blocked
                        ? "border-red-500/40 bg-red-500/10"
                        : "border-green-500/40 bg-green-500/10"
                      : "border-gray-800 bg-gray-950/40 hover:border-gray-700"
                  } ${blocked && !isActive ? "opacity-80" : ""}`}>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">
                    {s.accounts} {plural(s.accounts, "account")}
                    {tag}
                  </div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-gray-100">
                    {usd0(s.fastDaily)}
                    <span className="ml-1 text-[10px] font-normal text-gray-500">
                      /day each
                    </span>
                  </div>
                  {!blocked && (
                    <div className="mt-0.5 text-[11px] tabular-nums text-amber-300/90">
                      aim {usd0(s.perAccountTarget)}/acct
                    </div>
                  )}
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
          {(() => {
            // Effort comparison: same payout, different grind. Fewer accounts =
            // a much heavier per-account monthly target (more time in market).
            const rows = payout.scenarios
              .filter((s) => s.shortfall === 0)
              .sort((a, b) => a.accounts - b.accounts);
            if (rows.length < 2) return null;
            const maxTarget = Math.max(...rows.map((s) => s.perAccountTarget));
            const riskColor = (label: string) =>
              label === "conservative"
                ? "text-green-400"
                : label === "moderate"
                  ? "text-amber-300"
                  : "text-red-400";
            return (
              <div className="mt-5 border-t border-gray-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEffort((v) => !v)}
                  aria-expanded={showEffort}
                  className="flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-left transition-colors hover:bg-gray-800/40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-gray-600">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">
                    Effort by approach
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
                    {showEffort ? "hide" : "same payout, different grind"}
                    <span
                      className={`transition-transform ${showEffort ? "rotate-90" : ""}`}>
                      ▸
                    </span>
                  </span>
                </button>
                {!showEffort ? null : (
                <>
                <p className="mb-3 mt-2 text-[10px] leading-relaxed text-gray-600">
                  Same {eur0(fromUsd(payout.totalCash))} payout, different grind.
                  More accounts split the work, so each one earns far less — the
                  bar shows the monthly target per account.
                </p>
                <div className="overflow-x-auto">
                  <div className="min-w-[560px] space-y-1.5">
                    <div className="flex items-center gap-3 px-1 text-[10px] uppercase tracking-wider text-gray-600">
                      <span className="w-20">Approach</span>
                      <span className="flex-1">Per-account target</span>
                      <span className="w-20 text-right">Daily/acct</span>
                      <span className="w-14 text-right">Days</span>
                      <span className="w-20 text-right">Risk</span>
                    </div>
                    {rows.map((s) => {
                      const isActive = s.accounts === payout.accountsNeeded;
                      const width = Math.max(
                        6,
                        (s.perAccountTarget / maxTarget) * 100,
                      );
                      return (
                        <button
                          key={s.accounts}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => {
                            setAccountsOverride(
                              s.accounts === payout.recommendedAccounts
                                ? null
                                : s.accounts,
                            );
                            setDailyPaceInput(String(s.fastDaily));
                          }}
                          className={`flex w-full items-center gap-3 rounded px-1 py-1 text-left transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-gray-500 ${
                            isActive
                              ? "bg-green-500/10"
                              : "hover:bg-gray-800/40"
                          }`}>
                          <span
                            className={`w-20 shrink-0 text-xs tabular-nums ${
                              isActive ? "text-green-400" : "text-gray-300"
                            }`}>
                            {s.accounts} {plural(s.accounts, "acct")}
                          </span>
                          <span className="flex flex-1 items-center gap-2">
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
                              <span
                                className="block h-full rounded-full bg-amber-400/70"
                                style={{ width: `${width}%` }}
                              />
                            </span>
                            <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-amber-300">
                              {usd0(s.perAccountTarget)}
                            </span>
                          </span>
                          <span className="w-20 text-right text-xs tabular-nums text-gray-400">
                            {usd0(s.fastDaily)}
                          </span>
                          <span className="w-14 text-right text-xs tabular-nums text-gray-400">
                            {s.completionDay}
                          </span>
                          <span
                            className={`w-20 text-right text-[11px] ${riskColor(s.riskLabel)}`}>
                            {s.riskLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                </>
                )}
              </div>
            );
          })()}
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="7 · Germany Tax 2026"
        defaultOpen
        action={
          <span className="whitespace-nowrap text-[10px] normal-case tracking-normal text-gray-500 group-open:hidden">
            {eur(calculations.monthly)} gross ·{" "}
            <span className="text-green-400">
              {eur(calculations.netMonthly)} net
            </span>{" "}
            · {calculations.effectiveTaxRate.toFixed(1)}%
          </span>
        }>
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
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
            format={eur}
          />
          {calculations.solidaritySurcharge > 0 && (
            <DeductionRow
              label="Solidarity"
              annual={calculations.solidaritySurcharge}
              monthly={calculations.monthlySolidaritySurcharge}
              format={eur}
            />
          )}
          {calculations.churchTax > 0 && (
            <DeductionRow
              label="Church Tax"
              annual={calculations.churchTax}
              monthly={calculations.monthlyChurchTax}
              format={eur}
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
            format={eur}
          />
          <DeductionRow
            label="Care"
            annual={calculations.annualCareInsurance}
            monthly={calculations.monthlyCareInsurance}
            format={eur}
          />
          {employmentMode === "employed" && (
            <>
              <DeductionRow
                label="Pension"
                annual={calculations.annualPensionInsurance}
                monthly={calculations.monthlyPensionInsurance}
                format={eur}
              />
              <DeductionRow
                label="Unemployment"
                annual={calculations.annualUnemploymentInsurance}
                monthly={calculations.monthlyUnemploymentInsurance}
                format={eur}
              />
            </>
          )}
          <DeductionRow
            label="Total Deductions"
            annual={calculations.totalDeductions}
            monthly={calculations.monthlyTotalDeductions}
            format={eur}
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
      </CollapsibleSection>
      <CollapsibleSection
        title="Disposable after expenses"
        action={
          <span className="whitespace-nowrap text-[10px] normal-case tracking-normal text-gray-500 group-open:hidden">
            <span
              className={
                calculations.disposableMonthly >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }>
              {eur(calculations.disposableMonthly)}/month
            </span>
          </span>
        }>
        <label className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-wider text-gray-500">
            Monthly Expenses
          </span>
          <span className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-2.5 z-10 flex items-center text-xs text-gray-600">
              {symbol}
            </span>
            <input
              type="number"
              value={monthlyExpenses}
              onChange={(e) =>
                setMonthlyExpenses(normalizeNumberInput(e.target.value))
              }
              className="number-input w-28 rounded border border-gray-800 bg-gray-950 py-1.5 pl-6 pr-6 text-center text-sm font-semibold text-white focus:border-gray-600 focus:outline-none"
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

      <CollapsibleSection
        title="Other income levels"
        action={
          <span className="whitespace-nowrap text-[10px] normal-case tracking-normal text-gray-500 group-open:hidden">
            Current net{" "}
            <span className="text-green-400">
              {eur(calculations.netMonthly)}/month
            </span>
          </span>
        }>
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
                  isCurrent ? "border border-green-500/30 bg-green-500/10" : ""
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
                    isCurrent ? "text-green-400 font-semibold" : "text-gray-300"
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

      <CollapsibleSection
        title="Employee vs Freelancer"
        action={
          <span className="whitespace-nowrap text-[10px] normal-case tracking-normal text-gray-500 group-open:hidden">
            Same net{" "}
            <span className="text-green-400">
              {eur(ec.targetNetMonthly)}/month
            </span>
          </span>
        }>
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
