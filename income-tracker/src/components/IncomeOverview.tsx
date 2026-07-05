import type { IncomeTrackerModel } from "../hooks/useIncomeTracker";
import { makeMoney } from "../lib/format";
import { CollapsibleSection } from "./ui";

export function IncomeOverview({ model }: { model: IncomeTrackerModel }) {
  const { calculations, hoursPerDay, currency, eurUsdRate } = model;
  const { money: eur, money0: eur0 } = makeMoney(currency, eurUsdRate);

  return (
    <CollapsibleSection
      title="Income at a Glance"
      defaultOpen
      action={
        <>
          <span className="text-[10px] normal-case tracking-normal text-gray-600 group-open:inline hidden">
              net = after {calculations.effectiveTaxRate.toFixed(0)}% German
              tax · hourly {eur0(calculations.hourlyRate)} over{" "}
              {hoursPerDay || 1}h
          </span>
          <span className="whitespace-nowrap text-[9px] normal-case tracking-normal text-gray-500 group-open:hidden sm:text-[10px]">
            Weekly • <span className="text-green-400">{eur0(calculations.netAnnual / 52)}</span>
            <span className="mx-1.5 text-gray-700">|</span>
            Monthly • <span className="text-green-400">{eur0(calculations.netMonthly)}</span>
            <span className="mx-1.5 hidden text-gray-700 md:inline">|</span>
            <span className="hidden md:inline">
              Yearly • <span className="text-green-400">{eur0(calculations.netAnnual)}</span>
            </span>
          </span>
        </>
      }>
          <div className="space-y-1 text-sm">
            <div className="flex gap-2 px-2 text-[10px] uppercase tracking-wider text-gray-600">
              <span className="flex-1">Timeframe</span>
              <span className="w-28 text-right">Gross (pre-tax)</span>
              <span className="w-28 text-right">Net (after tax)</span>
            </div>
            {(
              [
                {
                  label: `Per Trading Day (×${calculations.tradingDaysPerMonth})`,
                  gross: calculations.daily,
                  net:
                    calculations.tradingDaysPerMonth > 0
                      ? calculations.netMonthly /
                        calculations.tradingDaysPerMonth
                      : 0,
                  highlight: false,
                },
                {
                  label: "Weekly",
                  gross: calculations.weekly,
                  net: calculations.netAnnual / 52,
                  highlight: false,
                },
                {
                  label: "Monthly",
                  gross: calculations.monthly,
                  net: calculations.netMonthly,
                  highlight: true,
                },
                {
                  label: "Yearly",
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
    </CollapsibleSection>
  );
}
