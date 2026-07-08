import { useState } from "react";
import type { IncomeTrackerModel } from "../hooks/useIncomeTracker";
import {
  type OptimizerCriterion,
  rankOptimizerRows,
} from "../lib/domain";
import { makeMoney, plural } from "../lib/format";
import { CollapsibleSection, normalizeNumberInput, Segmented } from "./ui";

// What a trader can optimise for. Cash kept is the default; the rest reward the
// least-demanding plan, so each names why a size wins and how to phrase it.
const SORTS: {
  value: OptimizerCriterion;
  label: string;
  badge: string;
  blurb: string;
}[] = [
  { value: "kept", label: "Kept", badge: "best value", blurb: "keeps the most" },
  {
    value: "pace",
    label: "Daily Pace",
    badge: "easiest pace",
    blurb: "has the gentlest daily pace",
  },
  {
    value: "aim",
    label: "Aim",
    badge: "lowest aim",
    blurb: "asks the least per account",
  },
  {
    value: "risk",
    label: "Risk",
    badge: "lowest risk",
    blurb: "risks the least per day",
  },
];

// Ranks the firm's account sizes by the cash you keep AFTER the monthly account
// fee — the one comparison the single-account plan can't show. Rows are sorted
// best-first; picking one applies that size to the whole tracker.
export function AccountOptimizer({ model }: { model: IncomeTrackerModel }) {
  const {
    optimizer,
    firmPresets,
    presetCosts,
    setPresetCost,
    applyPreset,
    accountSize,
    currency,
    eurUsdRate,
  } = model;
  const { money0, usd0, fromUsd } = makeMoney(currency, eurUsdRate);

  const [sortBy, setSortBy] = useState<OptimizerCriterion>("kept");
  const sort = SORTS.find((s) => s.value === sortBy) ?? SORTS[0];

  const activeSize = Number.parseFloat(accountSize);
  const riskColor = (label: string) =>
    label === "conservative"
      ? "text-green-400"
      : label === "moderate"
        ? "text-amber-300"
        : "text-red-400";

  // Rank for the chosen dimension; invalid plans always fall to the bottom so
  // their shortfall stays visible rather than hidden.
  const { rows, bestLabel } = rankOptimizerRows(optimizer.rows, sortBy);
  const best = rows.find((r) => r.label === bestLabel) ?? null;

  return (
    <CollapsibleSection
      title="★ Best Account for This Target"
      defaultOpen
      className="border-amber-400/25 bg-amber-400/[0.04]"
      action={
        best ? (
          <span className="whitespace-nowrap text-[10px] normal-case tracking-normal text-gray-500 group-open:hidden">
            <span className="text-amber-300">{best.label}</span> keeps{" "}
            <span className="text-green-400">
              {money0(fromUsd(best.netAfterFees))}
            </span>
            /mo after fees
          </span>
        ) : (
          <span className="whitespace-nowrap text-[10px] normal-case tracking-normal text-red-400 group-open:hidden">
            no size reaches this target
          </span>
        )
      }>
      <p className="mb-3 text-[11px] leading-relaxed text-gray-500">
        Same income target, every firm size compared. Rank by what matters to
        you — cash kept after fees, or the least-demanding plan. Profit &amp;
        daily pace are firm-side USD; cash kept is in your currency. Tap a size
        to load it into the plan above. Fees are editable — set your firm's real
        price.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-gray-500">
          Rank by
        </span>
        <Segmented
          label="Rank accounts by"
          value={sortBy}
          onChange={setSortBy}
          options={SORTS.map((s) => ({
            value: s.value,
            label: s.label,
            active: "bg-amber-400/15 text-amber-200",
          }))}
        />
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const preset = firmPresets.find((p) => p.label === row.label);
          const isBest = row.label === bestLabel;
          const isActive = row.accountSize === activeSize;
          const feeValue = presetCosts[row.label] ?? "";
          return (
            <div
              key={row.label}
              className={`rounded-lg border p-3 transition-colors ${
                isBest
                  ? "border-amber-400/40 bg-amber-400/[0.07]"
                  : row.valid
                    ? "border-gray-800 bg-gray-950/40"
                    : "border-red-500/25 bg-red-500/[0.05]"
              } ${isActive ? "ring-1 ring-inset ring-green-500/40" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                {/* Size + apply */}
                <button
                  type="button"
                  aria-pressed={isActive}
                  disabled={!preset}
                  onClick={() => preset && applyPreset(preset)}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-gray-800/50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-gray-500 disabled:opacity-50">
                  <span className="text-lg font-bold tabular-nums text-gray-100">
                    {row.label}
                  </span>
                  {isBest && (
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      {sort.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="text-[10px] uppercase tracking-wider text-green-400">
                      loaded
                    </span>
                  )}
                </button>

                {/* Net after fees — the headline */}
                <div className="text-right">
                  <div
                    className={`text-lg font-bold tabular-nums ${
                      row.valid ? "text-green-400" : "text-red-400"
                    }`}>
                    {money0(fromUsd(row.netAfterFees))}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    kept after fees
                  </div>
                </div>
              </div>

              {row.valid ? (
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-800 pt-3 text-[11px] sm:grid-cols-4">
                  <Metric
                    label="Accounts"
                    value={`${row.accountsNeeded} × ${row.label}`}
                  />
                  <Metric
                    label="Aim / account"
                    value={usd0(row.profitPerAccount)}
                    valueClass="text-amber-300"
                  />
                  <Metric
                    label="Daily pace"
                    value={`${usd0(row.dailyPace)}/day`}
                  />
                  <Metric
                    label="Risk"
                    value={`${row.dailyRiskPct.toFixed(2)}%`}
                    valueClass={riskColor(row.riskLabel)}
                    sub={row.riskLabel}
                  />
                  <Metric
                    label="Days in market"
                    value={`${row.completionDay} ${plural(row.completionDay, "day")}`}
                  />
                  <Metric
                    label="Payouts"
                    value={`${row.cyclesUsed} / acct`}
                  />
                  <Metric
                    label="Gross cash"
                    value={money0(fromUsd(row.grossCash))}
                  />
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">
                      Fee / mo (USD)
                    </span>
                    <span className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[11px] text-gray-600">
                        $
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        aria-label={`${row.label} monthly fee`}
                        value={feeValue}
                        onChange={(e) =>
                          setPresetCost(
                            row.label,
                            normalizeNumberInput(e.target.value),
                          )
                        }
                        className="number-input h-7 w-full rounded border border-gray-800 bg-gray-950 pl-5 pr-2 text-right text-xs font-semibold tabular-nums text-white focus:border-gray-600 focus:outline-none"
                      />
                    </span>
                  </label>
                </div>
              ) : (
                <div className="mt-3 border-t border-red-500/20 pt-3 text-[11px] leading-relaxed text-red-300">
                  {row.shortfall > 0
                    ? `Falls ${money0(fromUsd(row.shortfall))} short — the payout cap can't release enough on this size. It would take more accounts or a higher cap.`
                    : "Breaks a firm rule at this target (not enough trading days for the required payouts)."}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {best && (
        <p className="mt-4 border-t border-amber-400/10 pt-3 text-[11px] leading-relaxed text-gray-500">
          <span className="text-amber-300">{best.label}</span> {sort.blurb} —
          keeping{" "}
          <span className="text-green-400">
            {money0(fromUsd(best.netAfterFees))}
          </span>{" "}
          after {money0(fromUsd(best.totalCost))} in fees, reaching the target
          with {best.accountsNeeded} {plural(best.accountsNeeded, "account")} in{" "}
          {best.completionDay} {plural(best.completionDay, "day")} at{" "}
          {best.riskLabel} risk. This is firm-side, before German tax (section 7
          applies that to the gross).
        </p>
      )}
    </CollapsibleSection>
  );
}

function Metric({
  label,
  value,
  sub,
  valueClass = "text-gray-200",
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>
        {value}
      </span>
      {sub && <span className="text-[10px] text-gray-500">{sub}</span>}
    </div>
  );
}
