import { useState, useMemo, type ReactNode } from "react";

// =============================================================================
// GERMANY TAX CONSTANTS 2026
// =============================================================================
// Sources:
// - Income Tax: https://www.bundesfinanzministerium.de (EStG §32a)
// - 2026 Changes: https://perfinex.de/germany-2026-tax-changes/
// - Social Security: https://www.tk.de/en/become-a-member/join-tk/contribution-rate-social-security-2037092
// - Contribution Ceilings: https://germanpedia.com/contribution-assessment-ceiling-germany/
// - 2026 Ceilings: https://ogletree.com/insights-resources/blog-posts/germany-increases-social-security-contribution-and-compulsory-insurance-ceilings-effective-january-1-2026/
// =============================================================================

// Income Tax Brackets (Einkommensteuer) - 2026
const TAX_FREE_ALLOWANCE = 12348; // Grundfreibetrag (single) - up from €12,096 in 2025
const ZONE_2_END = 17443; // End of 14-24% progressive zone
const ZONE_3_END = 69000; // End of 24-42% progressive zone - up from €66,760 in 2025
const ZONE_4_END = 277825; // End of 42% flat zone (Reichensteuer threshold)
const TOP_TAX_RATE = 0.45; // Reichensteuer (45%)
const HIGH_TAX_RATE = 0.42; // Spitzensteuersatz (42%)

// Zone formula coefficients (from BMF Programmablaufplan)
const ZONE_2_COEF_A = 922.98;
const ZONE_2_COEF_B = 1400;
const ZONE_3_COEF_A = 176.02;
const ZONE_3_COEF_B = 2397;
const ZONE_3_OFFSET = 1015.13;
const ZONE_4_OFFSET = 10602.13;
const ZONE_5_OFFSET = 18936.88;

// Solidarity Surcharge (Solidaritätszuschlag)
const SOLI_RATE = 0.055; // 5.5% of income tax
const SOLI_THRESHOLD = 18130; // Only charged above this income tax amount

// Church Tax (Kirchensteuer)
const CHURCH_TAX_RATE = 0.09; // 9% (8% in Bavaria/Baden-Württemberg)

// Health Insurance (Krankenversicherung) - 2026
const HEALTH_INSURANCE_BASE_RATE = 0.146; // 14.6% base rate
const HEALTH_INSURANCE_ADDITIONAL = 0.025; // ~2.5% average Zusatzbeitrag
const HEALTH_INSURANCE_TOTAL =
  HEALTH_INSURANCE_BASE_RATE + HEALTH_INSURANCE_ADDITIONAL;

// Care Insurance (Pflegeversicherung) - 2026
const CARE_INSURANCE_RATE = 0.036; // 3.6% base (4.2% for childless 23+)

// Pension Insurance (Rentenversicherung) - 2026
const PENSION_INSURANCE_RATE = 0.186; // 18.6% total (employee pays half)

// Unemployment Insurance (Arbeitslosenversicherung) - 2026
const UNEMPLOYMENT_INSURANCE_RATE = 0.026; // 2.6% total (employee pays half)

// Contribution Ceilings (Beitragsbemessungsgrenzen) - 2026
const HEALTH_INSURANCE_CEILING = 69750; // Annual ceiling for health/care
const PENSION_INSURANCE_CEILING = 101400; // Annual ceiling for pension (West)

// =============================================================================
// PURE CALCULATION ENGINE (German 2026)
// =============================================================================
// Single source of truth for tax + social contributions. The forward UI, the
// comparison table, and the employment-vs-self-employment ladder all derive
// from these — no duplicated pipelines.

// Progressive Einkommensteuer with Ehegattensplitting.
function calculateGermanIncomeTax(
  taxableIncome: number,
  married: boolean,
): number {
  const splitIncome = married ? taxableIncome / 2 : taxableIncome;

  let tax: number;
  if (splitIncome <= TAX_FREE_ALLOWANCE) {
    tax = 0;
  } else if (splitIncome <= ZONE_2_END) {
    const y = (splitIncome - TAX_FREE_ALLOWANCE) / 10000;
    tax = (ZONE_2_COEF_A * y + ZONE_2_COEF_B) * y;
  } else if (splitIncome <= ZONE_3_END) {
    const z = (splitIncome - ZONE_2_END) / 10000;
    tax = (ZONE_3_COEF_A * z + ZONE_3_COEF_B) * z + ZONE_3_OFFSET;
  } else if (splitIncome <= ZONE_4_END) {
    tax = HIGH_TAX_RATE * splitIncome - ZONE_4_OFFSET;
  } else {
    tax = TOP_TAX_RATE * splitIncome - ZONE_5_OFFSET;
  }

  return married ? tax * 2 : tax;
}

interface TaxOpts {
  isFreelancer: boolean;
  married: boolean;
  church: boolean;
}

interface Breakdown {
  grossAnnual: number;
  healthInsurance: number;
  careInsurance: number;
  pensionInsurance: number;
  unemploymentInsurance: number;
  totalSocial: number;
  incomeTax: number;
  soli: number;
  churchTax: number;
  totalTax: number;
  totalDeductions: number;
  netAnnual: number;
  effectiveRate: number;
}

// Gross annual income → full net breakdown. Freelancer pays both halves of
// health/care and no pension/unemployment; employee pays the employee half.
function computeBreakdown(grossAnnual: number, opts: TaxOpts): Breakdown {
  const healthCareBase = Math.min(grossAnnual, HEALTH_INSURANCE_CEILING);
  const pensionBase = Math.min(grossAnnual, PENSION_INSURANCE_CEILING);

  const healthInsurance = opts.isFreelancer
    ? healthCareBase * HEALTH_INSURANCE_TOTAL
    : healthCareBase * (HEALTH_INSURANCE_TOTAL / 2);
  const careInsurance = opts.isFreelancer
    ? healthCareBase * CARE_INSURANCE_RATE
    : healthCareBase * (CARE_INSURANCE_RATE / 2);
  const pensionInsurance = opts.isFreelancer
    ? 0
    : pensionBase * (PENSION_INSURANCE_RATE / 2);
  const unemploymentInsurance = opts.isFreelancer
    ? 0
    : pensionBase * (UNEMPLOYMENT_INSURANCE_RATE / 2);

  const totalSocial =
    healthInsurance + careInsurance + pensionInsurance + unemploymentInsurance;
  const taxableIncome = Math.max(
    0,
    grossAnnual - healthInsurance - careInsurance,
  );

  const incomeTax = calculateGermanIncomeTax(taxableIncome, opts.married);
  const soli = incomeTax > SOLI_THRESHOLD ? incomeTax * SOLI_RATE : 0;
  const churchTax = opts.church ? incomeTax * CHURCH_TAX_RATE : 0;

  const totalTax = incomeTax + soli + churchTax;
  const totalDeductions = totalTax + totalSocial;
  const netAnnual = grossAnnual - totalDeductions;

  return {
    grossAnnual,
    healthInsurance,
    careInsurance,
    pensionInsurance,
    unemploymentInsurance,
    totalSocial,
    incomeTax,
    soli,
    churchTax,
    totalTax,
    totalDeductions,
    netAnnual,
    effectiveRate: grossAnnual > 0 ? (totalDeductions / grossAnnual) * 100 : 0,
  };
}

// Employer-side statutory contributions on top of gross (the Arbeitgeberanteil):
// half of pension, unemployment, health and care, ceiling-capped.
function computeEmployerSocial(grossAnnual: number): number {
  const healthCareBase = Math.min(grossAnnual, HEALTH_INSURANCE_CEILING);
  const pensionBase = Math.min(grossAnnual, PENSION_INSURANCE_CEILING);
  return (
    healthCareBase * (HEALTH_INSURANCE_TOTAL / 2) +
    healthCareBase * (CARE_INSURANCE_RATE / 2) +
    pensionBase * (PENSION_INSURANCE_RATE / 2) +
    pensionBase * (UNEMPLOYMENT_INSURANCE_RATE / 2)
  );
}

// Invert computeBreakdown: find the gross that yields a target net. Net is
// monotonic in gross, so bisection converges to cent precision.
function solveGrossForNet(targetNetAnnual: number, opts: TaxOpts): number {
  if (targetNetAnnual <= 0) return 0;
  let lo = 0;
  let hi = Math.max(targetNetAnnual * 2, 50000);
  for (
    let g = 0;
    g < 100 && computeBreakdown(hi, opts).netAnnual < targetNetAnnual;
    g++
  ) {
    hi *= 2;
  }
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (computeBreakdown(mid, opts).netAnnual < targetNetAnnual) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// =============================================================================
// PRESENTATIONAL HELPERS
// =============================================================================
// Pure, module-scoped so they aren't recreated each render. They hold no state
// and own no business logic — formatting and layout only.

const formatNumber = (num: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

const eur = (num: number) => `€${formatNumber(num)}`;

// Collapsible section using native <details> — accessible and keyboard-driven
// with no extra state. The chevron rotates via the `group-open` variant.
function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-gray-800 bg-gray-900">
      <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-xs uppercase tracking-wider text-gray-500 hover:text-gray-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-gray-600 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="text-gray-600 transition-transform group-open:rotate-90">
          ▸
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function NumField({
  label,
  value,
  onChange,
  accent = false,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accent?: boolean;
  min?: number;
}) {
  return (
    // Full-height flex column with the input pushed to the bottom so labels of
    // any length (1 or 2 lines) keep every input aligned on the same baseline.
    <label className="flex h-full flex-col">
      <span className="mb-1 block text-[10px] uppercase leading-tight tracking-wider text-gray-500">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-auto w-full rounded border bg-gray-950 px-3 py-2 text-center text-base font-semibold text-white focus:outline-none ${
          accent
            ? "border-green-500/40 focus:border-green-500"
            : "border-gray-800 focus:border-gray-600"
        }`}
      />
    </label>
  );
}

function StatCard({
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
        className={`mt-1 whitespace-nowrap text-lg font-bold tabular-nums sm:text-xl ${accent}`}>
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-[10px] text-gray-500">{sub}</div>
      ) : null}
    </div>
  );
}

function DeductionRow({
  label,
  annual,
  monthly,
  strong = false,
}: {
  label: string;
  annual: number;
  monthly: number;
  strong?: boolean;
}) {
  const numCls = strong ? "text-red-400" : "text-gray-400";
  return (
    <div
      className={`flex items-baseline gap-2 ${
        strong
          ? "border-t border-gray-800 pt-2 font-medium text-gray-300"
          : "text-gray-400"
      }`}>
      <span className="flex-1 truncate">{label}</span>
      <span
        className={`w-24 whitespace-nowrap text-right tabular-nums ${numCls}`}>
        −€{formatNumber(annual)}
      </span>
      <span
        className={`w-20 whitespace-nowrap text-right tabular-nums ${numCls}`}>
        −€{formatNumber(monthly)}
      </span>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; active: string }[];
}) {
  return (
    <div className="flex gap-1 rounded bg-gray-950 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 text-xs transition-colors ${
            value === o.value ? o.active : "text-gray-500 hover:text-gray-300"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function IncomeTracker() {
  const [mode, setMode] = useState<"monthly" | "daily" | "net">("monthly");
  const [monthlyTarget, setMonthlyTarget] = useState("7500");
  const [dailyTarget, setDailyTarget] = useState("300");
  const [netTarget, setNetTarget] = useState("4500");
  const [tradingDaysPerWeek, setTradingDaysPerWeek] = useState("3");
  const [propFirmAccounts, setPropFirmAccounts] = useState("1");
  const [hoursPerDay, setHoursPerDay] = useState("5");
  const [hasChurchTax, setHasChurchTax] = useState(false);
  const [monthlyExpenses, setMonthlyExpenses] = useState("2000");
  const [employmentMode, setEmploymentMode] = useState<
    "freelancer" | "employed"
  >("freelancer");
  const [isMarried, setIsMarried] = useState(false);
  const [showAllLevels, setShowAllLevels] = useState(false);

  const calculations = useMemo(() => {
    const daysPerWeek = parseFloat(tradingDaysPerWeek) || 0;
    const accounts = parseFloat(propFirmAccounts) || 1;
    const hours = parseFloat(hoursPerDay) || 1;

    const tradingDaysPerMonth = Math.min(16, daysPerWeek * 4);

    let monthly, daily;
    if (mode === "monthly") {
      monthly = parseFloat(monthlyTarget) || 0;
      daily = tradingDaysPerMonth > 0 ? monthly / tradingDaysPerMonth : 0;
    } else if (mode === "daily") {
      daily = parseFloat(dailyTarget) || 0;
      monthly = daily * tradingDaysPerMonth;
    } else {
      // Net mode: back-solve the gross profit that nets the desired take-home,
      // given the current tax situation, then derive everything from it.
      const desiredNetMonthly = parseFloat(netTarget) || 0;
      monthly =
        solveGrossForNet(desiredNetMonthly * 12, {
          isFreelancer: employmentMode === "freelancer",
          married: isMarried,
          church: hasChurchTax,
        }) / 12;
      daily = tradingDaysPerMonth > 0 ? monthly / tradingDaysPerMonth : 0;
    }

    const annual = monthly * 12;
    const weekly = monthly / 4;
    const perAccount = accounts > 0 ? daily / accounts : 0;
    const hourlyRate = hours > 0 ? daily / hours : 0;

    // === GERMAN TAX CALCULATIONS (2026) ===
    const grossAnnual = annual;
    const b = computeBreakdown(grossAnnual, {
      isFreelancer: employmentMode === "freelancer",
      married: isMarried,
      church: hasChurchTax,
    });

    const annualHealthInsurance = b.healthInsurance;
    const annualCareInsurance = b.careInsurance;
    const annualPensionInsurance = b.pensionInsurance;
    const annualUnemploymentInsurance = b.unemploymentInsurance;
    const totalSocialSecurity = b.totalSocial;
    const incomeTax = b.incomeTax;
    const solidaritySurcharge = b.soli;
    const churchTax = b.churchTax;
    const totalDeductions = b.totalDeductions;
    const netAnnual = b.netAnnual;
    const netMonthly = netAnnual / 12;
    const effectiveTaxRate = b.effectiveRate;

    const expenses = parseFloat(monthlyExpenses) || 0;
    const disposableMonthly = netMonthly - expenses;
    const disposableAnnual = disposableMonthly * 12;

    // Monthly breakdown
    const monthlyIncomeTax = incomeTax / 12;
    const monthlySolidaritySurcharge = solidaritySurcharge / 12;
    const monthlyChurchTax = churchTax / 12;
    const monthlyHealthInsurance = annualHealthInsurance / 12;
    const monthlyCareInsurance = annualCareInsurance / 12;
    const monthlyPensionInsurance = annualPensionInsurance / 12;
    const monthlyUnemploymentInsurance = annualUnemploymentInsurance / 12;
    const monthlyTotalDeductions = totalDeductions / 12;

    return {
      tradingDaysPerMonth,
      annual,
      weekly,
      monthly,
      daily,
      perAccount,
      hourlyRate,
      incomeTax,
      solidaritySurcharge,
      churchTax,
      annualHealthInsurance,
      annualCareInsurance,
      annualPensionInsurance,
      annualUnemploymentInsurance,
      totalSocialSecurity,
      totalDeductions,
      netAnnual,
      netMonthly,
      effectiveTaxRate,
      disposableMonthly,
      disposableAnnual,
      monthlyIncomeTax,
      monthlySolidaritySurcharge,
      monthlyChurchTax,
      monthlyHealthInsurance,
      monthlyCareInsurance,
      monthlyPensionInsurance,
      monthlyUnemploymentInsurance,
      monthlyTotalDeductions,
    };
  }, [
    mode,
    monthlyTarget,
    dailyTarget,
    netTarget,
    tradingDaysPerWeek,
    propFirmAccounts,
    hoursPerDay,
    hasChurchTax,
    monthlyExpenses,
    employmentMode,
    isMarried,
  ]);

  // Generate comparison levels (4 below, current, 4 above)
  const comparisonLevels = useMemo(() => {
    const step = 1500;
    const current = calculations.monthly;
    const levels = [
      Math.max(1, current - step * 4),
      Math.max(1, current - step * 3),
      Math.max(1, current - step * 2),
      Math.max(1, current - step),
      current,
      current + step,
      current + step * 2,
      current + step * 3,
      current + step * 4,
    ];
    const unique = [...new Set(levels)];
    return unique.map((grossMonthly) => {
      const b = computeBreakdown(grossMonthly * 12, {
        isFreelancer: employmentMode === "freelancer",
        married: isMarried,
        church: hasChurchTax,
      });
      return {
        grossMonthly,
        netMonthly: b.netAnnual / 12,
        grossAnnual: b.grossAnnual,
        netAnnual: b.netAnnual,
        rate: b.effectiveRate,
      };
    });
  }, [calculations.monthly, employmentMode, isMarried, hasChurchTax]);

  // Index of the current row in comparisonLevels — used to render a compact
  // window (current ±1) until the user expands to the full ladder.
  const currentLevelIdx = comparisonLevels.findIndex(
    (l) => l.grossMonthly === calculations.monthly,
  );

  // Rows to show (compact window around current, or all) paired with each row's
  // previous *visible* net — so the Δ column is blank for the first shown row
  // instead of referencing a row that's hidden when collapsed.
  const visibleLevels = comparisonLevels
    .map((level, idx) => ({ level, idx }))
    .filter(({ idx }) => showAllLevels || Math.abs(idx - currentLevelIdx) <= 1)
    .map((item, vIdx, arr) => ({
      ...item,
      prevVisibleNet: vIdx > 0 ? arr[vIdx - 1].level.netMonthly : null,
    }));

  // Employment vs self-employment, anchored on the ACTUAL take-home computed
  // above (net of German tax on the trading profit) — NOT the gross target.
  // This keeps one consistent meaning of the input across the whole screen:
  // the gross target is taxed once, and everything here back-calculates from
  // the resulting net. The freelance "profit for same take-home" therefore
  // reconciles back to the original gross target.
  const employmentComparison = useMemo(() => {
    const targetNetMonthly = calculations.netMonthly;
    const targetNetAnnual = targetNetMonthly * 12;
    const married = isMarried;
    const church = hasChurchTax;

    // Employee: gross salary that yields this take-home + its real employer cost.
    const employeeGross = solveGrossForNet(targetNetAnnual, {
      isFreelancer: false,
      married,
      church,
    });
    const employerCost = employeeGross + computeEmployerSocial(employeeGross);

    // Freelancer: profit needed to match the take-home, and what to reserve.
    const freelancerMatchNet = solveGrossForNet(targetNetAnnual, {
      isFreelancer: true,
      married,
      church,
    });
    const fl = computeBreakdown(freelancerMatchNet, {
      isFreelancer: true,
      married,
      church,
    });
    const reserve = fl.totalTax + fl.healthInsurance + fl.careInsurance;

    return {
      targetNetMonthly,
      employeeGross,
      employerCost,
      freelancerMatchNet,
      reserve,
    };
  }, [calculations.netMonthly, isMarried, hasChurchTax]);

  const ec = employmentComparison;

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
        {/* Inputs */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs uppercase tracking-wider text-gray-500">
              Targets
            </h2>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                {
                  value: "monthly",
                  label: "Gross Monthly",
                  active: "bg-green-500/15 text-green-400",
                },
                {
                  value: "daily",
                  label: "Gross Daily",
                  active: "bg-green-500/15 text-green-400",
                },
                {
                  value: "net",
                  label: "Net Monthly",
                  active: "bg-green-500/15 text-green-400",
                },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {mode === "monthly" ? (
              <NumField
                label="Monthly Gross Profit"
                value={monthlyTarget}
                onChange={setMonthlyTarget}
                accent
              />
            ) : mode === "daily" ? (
              <NumField
                label="Daily Gross Profit"
                value={dailyTarget}
                onChange={setDailyTarget}
                accent
              />
            ) : (
              <NumField
                label="Monthly Net Income"
                value={netTarget}
                onChange={setNetTarget}
                accent
              />
            )}
            <NumField
              label="Days per Week"
              value={tradingDaysPerWeek}
              onChange={setTradingDaysPerWeek}
            />
            <NumField
              label="Accounts"
              value={propFirmAccounts}
              min={1}
              onChange={(v) =>
                setPropFirmAccounts(
                  v === "" ? "" : String(Math.max(1, Math.floor(Number(v) || 1))),
                )
              }
            />
            <NumField
              label="Hours per Day"
              value={hoursPerDay}
              onChange={setHoursPerDay}
            />
          </div>
        </section>

        {/* HERO — gross → net, visible in every input mode */}
        <section className="rounded-xl border border-green-500/20 bg-green-500/[0.05] p-5 sm:p-6">
          <div className="grid grid-cols-3 divide-x divide-gray-700/60">
            <div className="px-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-gray-400">
                Daily Gross
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-green-400 sm:text-3xl">
                {eur(calculations.daily)}
              </div>
              <div className="mt-1 text-[10px] text-gray-500">
                × {calculations.tradingDaysPerMonth} days
              </div>
            </div>
            <div className="px-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-gray-400">
                Monthly Gross
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-green-400 sm:text-3xl">
                {eur(calculations.monthly)}
              </div>
              <div className="mt-1 text-[10px] text-gray-500">before tax</div>
            </div>
            <div className="px-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-gray-400">
                Monthly Net
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-green-400 sm:text-3xl">
                {eur(calculations.netMonthly)}
              </div>
              <div className="mt-1 text-[10px] text-gray-500">
                after {calculations.effectiveTaxRate.toFixed(0)}% tax
              </div>
            </div>
          </div>
        </section>

        {/* Secondary detail — neutral; tiles always fill the row evenly.
            Whole-euro values keep large numbers from overflowing the tiles. */}
        <section className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
          {(parseFloat(propFirmAccounts) || 1) > 1 && (
            <StatCard
              label="Per Account"
              value={eur(calculations.perAccount)}
              sub={`× ${propFirmAccounts} accounts`}
            />
          )}
          <StatCard
            label="Hourly"
            value={eur(calculations.hourlyRate)}
            sub={`over ${hoursPerDay || 1}h`}
          />
          <StatCard label="Weekly" value={eur(calculations.weekly)} />
          <StatCard label="Annual" value={eur(calculations.annual)} />
        </section>
        {/* Tax — gross → net */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs uppercase tracking-wider text-gray-500">
              Germany Tax 2026
            </h2>
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
            />
            {calculations.solidaritySurcharge > 0 && (
              <DeductionRow
                label="Solidarity"
                annual={calculations.solidaritySurcharge}
                monthly={calculations.monthlySolidaritySurcharge}
              />
            )}
            {calculations.churchTax > 0 && (
              <DeductionRow
                label="Church Tax"
                annual={calculations.churchTax}
                monthly={calculations.monthlyChurchTax}
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
            />
            <DeductionRow
              label="Care"
              annual={calculations.annualCareInsurance}
              monthly={calculations.monthlyCareInsurance}
            />
            {employmentMode === "employed" && (
              <>
                <DeductionRow
                  label="Pension"
                  annual={calculations.annualPensionInsurance}
                  monthly={calculations.monthlyPensionInsurance}
                />
                <DeductionRow
                  label="Unemployment"
                  annual={calculations.annualUnemploymentInsurance}
                  monthly={calculations.monthlyUnemploymentInsurance}
                />
              </>
            )}
            <DeductionRow
              label="Total Deductions"
              annual={calculations.totalDeductions}
              monthly={calculations.monthlyTotalDeductions}
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
        </section>
        {/* Disposable — collapsible, like the sections below */}
        <CollapsibleSection title="Disposable after expenses">
          <label className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">
              Monthly Expenses
            </span>
            <input
              type="number"
              value={monthlyExpenses}
              onChange={(e) => setMonthlyExpenses(e.target.value)}
              className="w-28 rounded border border-gray-800 bg-gray-950 px-3 py-1.5 text-center text-sm font-semibold text-white focus:border-gray-600 focus:outline-none"
            />
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

        {/* Other income levels — collapsed by default */}
        <CollapsibleSection title="Other income levels">
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
                    isCurrent
                      ? "border border-green-500/30 bg-green-500/10"
                      : ""
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
                      isCurrent
                        ? "text-green-400 font-semibold"
                        : "text-gray-300"
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

        {/* Employee vs Freelancer — collapsed by default */}
        <CollapsibleSection title="Employee vs Freelancer">
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
      </div>
    </div>
  );
}
