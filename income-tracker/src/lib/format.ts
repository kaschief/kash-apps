// Money + text formatting — single source of truth shared by every view.
// The app's numbers come in two currencies: firm-side figures are always USD
// (payout caps, balances), and the trader's display currency is EUR or USD.

export type Currency = "EUR" | "USD";

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });

export interface Money {
  symbol: string;
  /** Display currency, 2 decimals. */
  money: (value: number) => string;
  /** Display currency, whole units. */
  money0: (value: number) => string;
  /** Plain number, 2 decimals, no symbol. */
  format: (value: number) => string;
  /** USD, 2 decimals. */
  usd: (value: number) => string;
  /** USD, whole units. */
  usd0: (value: number) => string;
  /** Convert a USD amount into the display currency. */
  fromUsd: (value: number) => number;
}

export function makeMoney(
  currency: Currency,
  eurUsdRate: number | null,
): Money {
  const symbol = currency === "EUR" ? "€" : "$";
  return {
    symbol,
    money: (value) => `${symbol}${nf(2, 2).format(value)}`,
    money0: (value) => `${symbol}${nf(0, 0).format(value)}`,
    format: (value) => nf(2, 2).format(value),
    usd: (value) => `$${nf(2, 2).format(value)}`,
    usd0: (value) => `$${nf(0, 0).format(value)}`,
    fromUsd: (value) =>
      currency === "EUR" ? value / (eurUsdRate ?? 1) : value,
  };
}

/** "1 account" / "3 accounts" without hand-rolling the check each time. */
export const plural = (
  n: number,
  singular: string,
  pluralForm = `${singular}s`,
) => (n === 1 ? singular : pluralForm);
