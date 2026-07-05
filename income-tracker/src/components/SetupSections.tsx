import {
  FieldGrid,
  FormSection,
  NumberField,
  Segmented,
} from "./ui";

const money = (value: string | number, code: "EUR" | "USD") =>
  `${code === "EUR" ? "€" : "$"}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value) || 0)}`;

const compactMoney = (value: string | number, code: "EUR" | "USD") =>
  `${code === "EUR" ? "€" : "$"}${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)}`;

type IncomeMode = "gross" | "net";

type IncomeGoalSectionProps = {
  currency: "EUR" | "USD";
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
  currency,
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
      summary={
        <span className="whitespace-nowrap text-[10px] normal-case tracking-normal text-gray-500">
          <span className="text-green-400">
            {money(mode === "gross" ? monthlyTarget : netTarget, currency)} {mode}
          </span>{" "}
          · {tradingDays} days · {hoursPerDay}h/day
        </span>
      }
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
            currency={currency}
            accent
            min={0}
          />
        ) : (
          <NumberField
            label="Net Income / Month"
            hint="after German tax — gross is back-solved"
            value={netTarget}
            onChange={onNetTargetChange}
            currency={currency}
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
          label="My Daily Target (USD)"
          hint="optional firm-account pace — always USD"
          value={dailyTarget}
          onChange={onDailyTargetChange}
          currency="USD"
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
  readonly minDailyProfit: number;
  readonly bufferPerAccount: number;
};

type FirmRulesSectionProps = {
  currency: "EUR" | "USD";
  presets: readonly FirmPreset[];
  activeAccountSize: number;
  onPresetSelect: (preset: FirmPreset) => void;
  accountSize: string;
  onAccountSizeChange: (value: string) => void;
  payoutSplitPct: string;
  onPayoutSplitPctChange: (value: string) => void;
  profitReleasePct: string;
  onProfitReleasePctChange: (value: string) => void;
  maxPayout: string;
  onMaxPayoutChange: (value: string) => void;
  minWinningDays: string;
  onMinWinningDaysChange: (value: string) => void;
  minProfitPerDay: string;
  onMinProfitPerDayChange: (value: string) => void;
  minCycleProfit: string;
  onMinCycleProfitChange: (value: string) => void;
  bufferPerAccount: string;
  onBufferPerAccountChange: (value: string) => void;
};

export function FirmRulesSection({
  currency,
  presets,
  activeAccountSize,
  onPresetSelect,
  accountSize,
  onAccountSizeChange,
  payoutSplitPct,
  onPayoutSplitPctChange,
  profitReleasePct,
  onProfitReleasePctChange,
  maxPayout,
  onMaxPayoutChange,
  minWinningDays,
  onMinWinningDaysChange,
  minProfitPerDay,
  onMinProfitPerDayChange,
  minCycleProfit,
  onMinCycleProfitChange,
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
    <FormSection
      title="2 · Prop Firm Rules"
      action={presetPicker}
      summary={
        <span className="whitespace-nowrap text-[10px] normal-case tracking-normal text-gray-500">
          {compactMoney(accountSize, currency)} · {payoutSplitPct}% split ·{" "}
          {profitReleasePct}% available · {money(maxPayout, currency)} max
        </span>
      }>
      <FieldGrid columns={4}>
        <NumberField
          label="Account Size"
          hint="starting balance of one account"
          value={accountSize}
          onChange={onAccountSizeChange}
          currency="USD"
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
          label="Profit Available %"
          hint="share of cycle profit available to withdraw"
          value={profitReleasePct}
          onChange={onProfitReleasePctChange}
          min={1}
          max={100}
        />
        <NumberField
          label="Max Payout / Request"
          hint="profit withdrawable per account, per payout"
          value={maxPayout}
          onChange={onMaxPayoutChange}
          currency="USD"
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
          currency="USD"
          min={0}
        />
        <NumberField
          label="Min Cycle Profit"
          hint="net profit required between payout requests"
          value={minCycleProfit}
          onChange={onMinCycleProfitChange}
          currency="USD"
          min={0}
        />
        <NumberField
          label="Buffer per Account"
          hint="profit left in the account as drawdown cushion"
          value={bufferPerAccount}
          onChange={onBufferPerAccountChange}
          currency="USD"
          min={0}
        />
      </FieldGrid>
    </FormSection>
  );
}
