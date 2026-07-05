import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  action?: ReactNode;
  align?: "center" | "baseline";
};

export function SectionHeader({
  title,
  action,
  align = "center",
}: SectionHeaderProps) {
  return (
    <div
      className={`mb-3 flex flex-wrap justify-between gap-2 ${
        align === "baseline" ? "items-baseline" : "items-center"
      }`}>
      <h2 className="text-xs uppercase tracking-wider text-gray-500">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function FormSection({
  title,
  action,
  summary,
  children,
}: SectionHeaderProps & { summary?: ReactNode; children: ReactNode }) {
  return (
    <CollapsibleSection
      title={title}
      defaultOpen
      action={
        summary ? <span className="group-open:hidden">{summary}</span> : null
      }>
      {action ? <div className="mb-3 flex justify-end">{action}</div> : null}
      {children}
    </CollapsibleSection>
  );
}

export function FieldGrid({
  columns = 4,
  children,
}: {
  columns?: 3 | 4;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-2 items-start gap-x-3 gap-y-4 ${
        columns === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"
      }`}>
      {children}
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accent?: boolean;
  min?: number;
  max?: number;
  hint?: string;
  allowEmpty?: boolean;
  currency?: "EUR" | "USD";
};

export const normalizeNumberInput = (value: string) =>
  value.replace(/^(-?)0+(?=\d)/, "$1");

export function NumberField({
  label,
  value,
  onChange,
  accent = false,
  min,
  max,
  hint,
  allowEmpty = false,
  currency,
}: NumberFieldProps) {
  const clamp = () => {
    if (allowEmpty && value.trim() === "") return;

    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) {
      onChange(allowEmpty ? "" : String(min ?? 0));
    } else if (min !== undefined && parsed < min) {
      onChange(String(min));
    } else if (max !== undefined && parsed > max) {
      onChange(String(max));
    }
  };

  return (
    <label className="grid min-w-0 grid-rows-[1.5rem_2.5rem_2.25rem]">
      <span className="flex items-end text-[10px] uppercase leading-tight tracking-wider text-gray-500">
        {label}
      </span>
      <span className="relative mt-1 block">
        {currency ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-xs text-gray-600">
            {currency === "EUR" ? "€" : "$"}
          </span>
        ) : null}
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(normalizeNumberInput(event.target.value))}
          onBlur={clamp}
          className={`number-input h-10 w-full rounded border bg-gray-950 pr-8 text-center text-base font-semibold tabular-nums text-white focus:outline-none ${currency ? "pl-8" : "pl-3"} ${
            accent
              ? "border-green-500/40 focus:border-green-500"
              : "border-gray-800 focus:border-gray-600"
          }`}
        />
        {value !== "" && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={(event) => {
              event.preventDefault();
              onChange("");
            }}
            className="absolute inset-y-0 right-1 flex w-7 items-center justify-center text-gray-600 hover:text-gray-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-gray-500">
            <span aria-hidden="true" className="text-sm leading-none">
              ×
            </span>
          </button>
        )}
      </span>
      <span className="pt-1 text-[9px] leading-tight text-gray-600">
        {hint ?? "\u00a0"}
      </span>
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; active: string }[];
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-1 rounded bg-gray-950 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded px-3 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-gray-600 ${
            value === option.value
              ? option.active
              : "text-gray-500 hover:text-gray-300"
          }`}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  action,
  className = "border-gray-800 bg-gray-900",
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={`group rounded-xl border ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-xs uppercase tracking-wider text-gray-500 hover:text-gray-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-gray-600 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex items-center gap-3">
          {action}
          <span className="text-gray-600 transition-transform group-open:rotate-90">
            ▸
          </span>
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

// One headline tile in the "3 · The Plan" grid. `highlight` gives the amber
// "target" treatment; every tile shares one padding/typography contract so the
// row stays perfectly aligned.
export function PlanStat({
  label,
  value,
  sub,
  valueClass = "text-white",
  highlight = false,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  valueClass?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`px-2 py-2.5 text-center ${
        highlight
          ? "rounded-lg bg-amber-400/[0.06] ring-1 ring-inset ring-amber-400/25"
          : ""
      }`}>
      <div
        className={`text-[10px] uppercase tracking-wider sm:mb-1 ${
          highlight ? "text-amber-300/90" : "text-gray-400"
        }`}>
        {label}
      </div>
      <div
        className={`mt-0.5 text-xl font-bold tabular-nums sm:mt-0 sm:text-3xl ${
          highlight ? "tracking-tight" : ""
        } ${valueClass}`}>
        {value}
      </div>
      {sub != null ? (
        <div className="mt-0.5 text-[10px] leading-tight text-gray-500 sm:mt-1">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent = "text-white",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div
        className={`mt-1 whitespace-nowrap text-base font-bold tabular-nums sm:text-xl ${accent}`}>
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-[10px] text-gray-500">{sub}</div> : null}
    </div>
  );
}

export function DeductionRow({
  label,
  annual,
  monthly,
  format,
  strong = false,
}: {
  label: string;
  annual: number;
  monthly: number;
  format: (value: number) => string;
  strong?: boolean;
}) {
  const numberColor = strong ? "text-red-400" : "text-gray-400";
  return (
    <div
      className={`flex items-baseline gap-2 ${
        strong
          ? "border-t border-gray-800 pt-2 font-medium text-gray-300"
          : "text-gray-400"
      }`}>
      <span className="flex-1 truncate">{label}</span>
      <span className={`w-24 whitespace-nowrap text-right tabular-nums ${numberColor}`}>
        −{format(annual)}
      </span>
      <span className={`w-20 whitespace-nowrap text-right tabular-nums ${numberColor}`}>
        −{format(monthly)}
      </span>
    </div>
  );
}

export function CheckRow({
  ok,
  label,
  detail,
}: {
  ok: boolean | null;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span
        aria-hidden="true"
        className={`w-4 shrink-0 text-center ${
          ok === null ? "text-gray-600" : ok ? "text-green-400" : "text-red-400"
        }`}>
        {ok === null ? "·" : ok ? "✓" : "✕"}
      </span>
      <span className="w-28 shrink-0 text-gray-400 sm:w-32">{label}</span>
      <span className="flex-1 text-right text-xs leading-snug text-gray-500 tabular-nums sm:text-sm">
        {detail}
      </span>
    </div>
  );
}
