import type { IncomeTrackerModel } from "../hooks/useIncomeTracker";
import { makeMoney, plural } from "../lib/format";

export function PlanSummary({ model }: { model: IncomeTrackerModel }) {
  const { payout, calculations, accountSize, bufferPerAccount, currency, eurUsdRate } = model;
  const { money0: money, usd0: usd, fromUsd } = makeMoney(currency, eurUsdRate);

  if (payout.status !== "ok") return null;
  const valid = payout.checks.valid;
  const accent = valid ? "text-green-400" : "text-red-400";

  return (
    <section
      className={`rounded-xl border p-4 ${
        valid
          ? "border-green-500/30 bg-green-500/[0.07]"
          : "border-red-500/30 bg-red-500/[0.06]"
      }`}>
      <div className={`text-[10px] uppercase tracking-wider ${accent}`}>
        Monthly Plan Summary{valid ? "" : " · Needs attention"}
      </div>
      <div className="mt-3 flex flex-col items-center gap-0.5 text-center">
        <span className="text-[10px] uppercase tracking-wider text-amber-300/90">
          Aim to earn
        </span>
        <span className="text-3xl font-bold tracking-tight tabular-nums text-amber-300 sm:text-4xl">
          {usd(payout.perAccountEarnBuild)}
        </span>
        <span className="text-xs text-gray-400">
          per account · {usd(payout.dailyPace)}/day for{" "}
          {calculations.tradingDaysPerMonth} days
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-300">
        Trade <strong className="text-white">{payout.accountsNeeded} × {usd(Number(accountSize))}</strong>{" "}
        {plural(payout.accountsNeeded, "account")}. Submit {payout.cyclesUsed}{" "}
        {plural(payout.cyclesUsed, "payout")} per account to receive{" "}
        <strong className={accent}>{money(fromUsd(payout.totalCash))} gross</strong>, approximately{" "}
        <strong className={accent}>{money(calculations.netMonthly)} net</strong> after German deductions.
      </p>
      <div className="mt-2 text-[10px] text-gray-500">
        Includes {usd(Number(bufferPerAccount) || 0)} buffer per account.
      </div>
      <div className="mt-2 border-t border-green-500/10 pt-2 text-[10px] leading-relaxed text-gray-500">
        <div className="mb-1 text-gray-400">When each payout becomes available</div>
        <ul className="space-y-0.5">
          {payout.payoutEvents.map((event) => (
            <li key={event.index}>
              <span className="text-gray-300">Payout {event.index}: day {event.day}.</span>{" "}
              <span className="text-gray-400">
                Earn {usd(event.cumulativeProfit)} total per account by then
              </span>{" "}
              (+{usd(event.cycleProfit)} since the last payout).{" "}
              {event.profitDay > event.qualifyingDay
                ? `The ${event.qualifyingDay}-day trading rule is completed first, but you need until day ${event.profitDay} to earn the required profit and buffer.`
                : event.qualifyingDay > event.profitDay
                  ? `You earn enough by day ${event.profitDay}, but must wait until day ${event.qualifyingDay} to complete the trading-day rule.`
                  : `The trading-day rule and required profit are both completed on day ${event.day}.`}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
