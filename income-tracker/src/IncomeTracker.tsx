import { FirmRulesSection, IncomeGoalSection } from "./components/SetupSections";
import { AccountOptimizer } from "./components/AccountOptimizer";
import { CurrencySwitch } from "./components/CurrencySwitch";
import { IncomeOverview } from "./components/IncomeOverview";
import { PlanSummary } from "./components/PlanSummary";
import { TrackerResults } from "./components/TrackerResults";
import { useIncomeTracker } from "./hooks/useIncomeTracker";

export default function IncomeTracker() {
  const model = useIncomeTracker();
  const {
    mode,
    setMode,
    monthlyTarget,
    setMonthlyTarget,
    netTarget,
    setNetTarget,
    tradingDays,
    setTradingDays,
    hoursPerDay,
    setHoursPerDay,
    dailyPaceInput,
    setDailyPaceInput,
    accountSize,
    setAccountSize,
    payoutSplitPct,
    setPayoutSplitPct,
    profitReleasePct,
    setProfitReleasePct,
    maxPayoutPerAccount,
    setMaxPayoutPerAccount,
    minQualifyingDays,
    setMinQualifyingDays,
    minProfitPerDay,
    setMinProfitPerDay,
    minCycleProfit,
    setMinCycleProfit,
    bufferPerAccount,
    setBufferPerAccount,
    applyPreset,
    firmPresets,
  } = model;
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-mono">
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        <header className="flex items-center gap-3 border-b border-gray-800 pb-4">
          <div className="h-2 w-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
          <div>
            <h1 className="text-lg font-semibold text-white sm:text-xl">
              Kash's Income Tracker
            </h1>
            <p className="text-xs text-gray-500">
              Trading targets → German net pay (2026)
            </p>
          </div>
        </header>
        <div className="flex justify-end"><CurrencySwitch model={model} /></div>
        <IncomeGoalSection
          currency={model.currency}
          mode={mode}
          onModeChange={setMode}
          monthlyTarget={monthlyTarget}
          onMonthlyTargetChange={setMonthlyTarget}
          netTarget={netTarget}
          onNetTargetChange={setNetTarget}
          tradingDays={tradingDays}
          onTradingDaysChange={setTradingDays}
          hoursPerDay={hoursPerDay}
          onHoursPerDayChange={setHoursPerDay}
          dailyTarget={dailyPaceInput}
          onDailyTargetChange={setDailyPaceInput}
        />

        <IncomeOverview model={model} />

        <PlanSummary model={model} />

        <AccountOptimizer model={model} />

        <FirmRulesSection
          currency="USD"
          presets={firmPresets}
          activeAccountSize={Number.parseFloat(accountSize)}
          onPresetSelect={applyPreset}
          accountSize={accountSize}
          onAccountSizeChange={setAccountSize}
          payoutSplitPct={payoutSplitPct}
          onPayoutSplitPctChange={setPayoutSplitPct}
          profitReleasePct={profitReleasePct}
          onProfitReleasePctChange={setProfitReleasePct}
          maxPayout={maxPayoutPerAccount}
          onMaxPayoutChange={setMaxPayoutPerAccount}
          minWinningDays={minQualifyingDays}
          onMinWinningDaysChange={setMinQualifyingDays}
          minProfitPerDay={minProfitPerDay}
          onMinProfitPerDayChange={setMinProfitPerDay}
          minCycleProfit={minCycleProfit}
          onMinCycleProfitChange={setMinCycleProfit}
          bufferPerAccount={bufferPerAccount}
          onBufferPerAccountChange={setBufferPerAccount}
        />

        <TrackerResults model={model} />
      </div>
    </div>
  );
}
