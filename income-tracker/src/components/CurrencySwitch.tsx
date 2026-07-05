import type { IncomeTrackerModel } from "../hooks/useIncomeTracker";
import { Segmented } from "./ui";

export function CurrencySwitch({ model }: { model: IncomeTrackerModel }) {
  const { currency, changeCurrency, eurUsdRate, rateDate } = model;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-gray-600">
        {eurUsdRate ? `ECB ${rateDate} · €1 = $${eurUsdRate.toFixed(4)}` : "Loading exchange rate…"}
      </span>
      <Segmented
        label="Display currency"
        value={currency}
        onChange={changeCurrency}
        options={[
          { value: "EUR", label: "EUR", active: "bg-green-500/15 text-green-400" },
          { value: "USD", label: "USD", active: "bg-green-500/15 text-green-400" },
        ]}
      />
    </div>
  );
}
