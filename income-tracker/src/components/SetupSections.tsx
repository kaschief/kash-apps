import {
  FieldGrid,
  FormSection,
  NumberField,
  Segmented,
} from "./ui";

type IncomeMode = "gross" | "net";

type IncomeGoalSectionProps = {
  mode: IncomeMode;
  onModeChange: (mode: IncomeMode) => void;
  monthlyTarget: string;
  onMonthlyTargetChange: (value: string) => void;
  netTarget: string;
  onNetTargetChange: (value: string) => void;
  tradingDays: string;
  onTradingDaysChange: (value: string) => void;
  hoursPerDay: string;
  onHoursPerDayChange: (value: string) => void;
  dailyTarget: string;
  onDailyTargetChange: (value: string) => void;
};

export function IncomeGoalSection({
  mode,
  onModeChange,
  monthlyTarget,
  onMonthlyTargetChange,
  netTarget,
  onNetTargetChange,
  tradingDays,
  onTradingDaysChange,
  hoursPerDay,
  onHoursPerDayChange,
  dailyTarget,
  onDailyTargetChange,
}: IncomeGoalSectionProps) {
  return (
    <FormSection
      title="1 · Income Goal"
      action={
        <Segmented
          label="Income target type"
          value={mode}
          onChange={onModeChange}
          options={[
            {
              value: "gross",
              label: "Gross / Month",
              active: "bg-green-500/15 text-green-400",
            },
            {
              value: "net",
              label: "Net / Month",
              active: "bg-green-500/15 text-green-400",
            },
          ]}
        />
      }>
      <FieldGrid>
        {mode === "gross" ? (
          <NumberField
            label="Gross Income / Month"
            hint="cash withdrawn from payouts, before German tax"
            value={monthlyTarget}
            onChange={onMonthlyTargetChange}
            accent
            min={0}
          />
        ) : (
          <NumberField
            label="Net Income / Month"
            hint="after German tax — gross is back-solved"
            value={netTarget}
            onChange={onNetTargetChange}
            accent
            min={0}
          />
        )}
        <NumberField
          label="Trading Days"
          hint="days you'll actually trade this month"
          value={tradingDays}
          onChange={onTradingDaysChange}
          min={1}
          max={23}
        />
        <NumberField
          label="Hours per Day"
          hint="screen time — sets the hourly rate"
          value={hoursPerDay}
          onChange={onHoursPerDayChange}
          min={1}
          max={24}
        />
        <NumberField
          label="My Daily Target"
          hint="optional — blank lets the plan set the pace"
          value={dailyTarget}
          onChange={onDailyTargetChange}
          min={0}
          allowEmpty
        />
      </FieldGrid>
    </FormSection>
  );
}

export type FirmPreset = {
  readonly label: string;
  readonly accountSize: number;
  readonly maxPayout: number;
};

type FirmRulesSectionProps = {
  presets: readonly FirmPreset[];
  activeAccountSize: number;
  onPresetSelect: (preset: FirmPreset) => void;
  accountSize: string;
  onAccountSizeChange: (value: string) => void;
  payoutSplitPct: string;
  onPayoutSplitPctChange: (value: string) => void;
  maxPayout: string;
  onMaxPayoutChange: (value: string) => void;
  minWinningDays: string;
  onMinWinningDaysChange: (value: string) => void;
  minProfitPerDay: string;
  onMinProfitPerDayChange: (value: string) => void;
  bufferPerAccount: string;
  onBufferPerAccountChange: (value: string) => void;
};

export function FirmRulesSection({
  presets,
  activeAccountSize,
  onPresetSelect,
  accountSize,
  onAccountSizeChange,
  payoutSplitPct,
  onPayoutSplitPctChange,
  maxPayout,
  onMaxPayoutChange,
  minWinningDays,
  onMinWinningDaysChange,
  minProfitPerDay,
  onMinProfitPerDayChange,
  bufferPerAccount,
  onBufferPerAccountChange,
}: FirmRulesSectionProps) {
  const presetPicker = (
    <div
      role="group"
      aria-label="Account size preset"
      className="flex items-center gap-1 rounded bg-gray-950 p-1">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          aria-pressed={activeAccountSize === preset.accountSize}
          onClick={() => onPresetSelect(preset)}
          className={`rounded px-2.5 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-gray-600 ${
            activeAccountSize === preset.accountSize
              ? "bg-gray-700 text-gray-100"
              : "text-gray-500 hover:text-gray-300"
          }`}>
          {preset.label}
        </button>
      ))}
    </div>
  );

  return (
    <FormSection title="2 · Prop Firm Rules" action={presetPicker}>
      <FieldGrid columns={3}>
        <NumberField
          label="Account Size"
          hint="starting balance of one account"
          value={accountSize}
          onChange={onAccountSizeChange}
          min={25000}
        />
        <NumberField
          label="Profit Split %"
          hint="your share of withdrawn profit"
          value={payoutSplitPct}
          onChange={onPayoutSplitPctChange}
          min={1}
          max={100}
        />
        <NumberField
          label="Max Payout / Request"
          hint="profit withdrawable per account, per payout"
          value={maxPayout}
          onChange={onMaxPayoutChange}
          min={0}
        />
        <NumberField
          label="Min Winning Days"
          hint="green days required between payouts"
          value={minWinningDays}
          onChange={onMinWinningDaysChange}
          min={1}
        />
        <NumberField
          label="Min Profit / Winning Day"
          hint="a day only counts if it makes at least this"
          value={minProfitPerDay}
          onChange={onMinProfitPerDayChange}
          min={0}
        />
        <NumberField
          label="Buffer per Account"
          hint="profit left in the account as drawdown cushion"
          value={bufferPerAccount}
          onChange={onBufferPerAccountChange}
          min={0}
        />
      </FieldGrid>
    </FormSection>
  );
}
