import { useEffect, useMemo, useState } from "react";
import {
  FIRM_PRESETS,
  RISK_BANDS,
  computeBreakdown,
  computeEmployerSocial,
  computePayoutPlan,
  solveGrossForNet,
} from "../lib/domain";

export function useIncomeTracker() {
  const [currency, setCurrency] = useState<"EUR" | "USD">("EUR");
  const [eurUsdRate, setEurUsdRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState("");
  const [mode, setMode] = useState<"gross" | "net">("gross");
  const [monthlyTarget, setMonthlyTarget] = useState("9000");
  const [netTarget, setNetTarget] = useState("4500");
  const [tradingDays, setTradingDays] = useState("15");
  const [hoursPerDay, setHoursPerDay] = useState("5");

  const [dailyPaceInput, setDailyPaceInput] = useState("");
  const [accountsOverride, setAccountsOverride] = useState<number | null>(
    null,
  );
  const [hasChurchTax, setHasChurchTax] = useState(false);
  const [monthlyExpenses, setMonthlyExpenses] = useState("2000");
  const [employmentMode, setEmploymentMode] = useState<
    "freelancer" | "employed"
  >("freelancer");
  const [isMarried, setIsMarried] = useState(false);
  const [showAllLevels, setShowAllLevels] = useState(false);

  const [accountSize, setAccountSize] = useState("50000");
  const [payoutSplitPct, setPayoutSplitPct] = useState("90");
  const [profitReleasePct, setProfitReleasePct] = useState("50");
  const [maxPayoutPerAccount, setMaxPayoutPerAccount] = useState("2000");
  const [minQualifyingDays, setMinQualifyingDays] = useState("5");
  const [minProfitPerDay, setMinProfitPerDay] = useState("150");
  const [minCycleProfit, setMinCycleProfit] = useState("1");
  const [bufferPerAccount, setBufferPerAccount] = useState("1000");

  useEffect(() => {
    fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD")
      .then((response) => {
        if (!response.ok) throw new Error("Exchange-rate request failed");
        return response.json() as Promise<{ date: string; rates: { USD: number } }>;
      })
      .then((data) => {
        setEurUsdRate(data.rates.USD);
        setRateDate(data.date);
      })
      .catch(() => setEurUsdRate(null));
  }, []);

  const changeCurrency = (next: "EUR" | "USD") => {
    if (next === currency || !eurUsdRate) return;
    const factor = next === "USD" ? eurUsdRate : 1 / eurUsdRate;
    const convert = (value: string, setter: (value: string) => void) => {
      if (value === "") return;
      setter(String(Math.round((Number(value) * factor + Number.EPSILON) * 100) / 100));
    };
    [
      [monthlyTarget, setMonthlyTarget], [netTarget, setNetTarget],
      [monthlyExpenses, setMonthlyExpenses],
    ].forEach(([value, setter]) => convert(value as string, setter as (value: string) => void));
    setCurrency(next);
  };

  const applyPreset = (p: {
    accountSize: number;
    maxPayout: number;
    minDailyProfit: number;
    bufferPerAccount: number;
  }) => {
    setAccountSize(String(p.accountSize));
    setMaxPayoutPerAccount(String(p.maxPayout));
    setMinProfitPerDay(String(p.minDailyProfit));
    setBufferPerAccount(String(p.bufferPerAccount));
  };

  const calculations = useMemo(() => {
    const toEur = (value: number) => currency === "USD" ? value / (eurUsdRate ?? 1) : value;
    const fromEur = (value: number) => currency === "USD" ? value * (eurUsdRate ?? 1) : value;
    const hours = parseFloat(hoursPerDay) || 1;
    const tradingDaysPerMonth = Math.min(
      23,
      Math.max(0, parseFloat(tradingDays) || 0),
    );

    let monthly;
    if (mode === "gross") {
      monthly = parseFloat(monthlyTarget) || 0;
    } else {
      const desiredNetMonthly = toEur(parseFloat(netTarget) || 0);
      monthly =
        fromEur(solveGrossForNet(desiredNetMonthly * 12, {
          isFreelancer: employmentMode === "freelancer",
          married: isMarried,
          church: hasChurchTax,
        }) / 12);
    }
    const daily = tradingDaysPerMonth > 0 ? monthly / tradingDaysPerMonth : 0;

    const annual = monthly * 12;
    const weekly = (monthly * 12) / 52;
    const hourlyRate = hours > 0 ? daily / hours : 0;

    const grossAnnual = toEur(annual);
    const b = computeBreakdown(grossAnnual, {
      isFreelancer: employmentMode === "freelancer",
      married: isMarried,
      church: hasChurchTax,
    });

    const annualHealthInsurance = fromEur(b.healthInsurance);
    const annualCareInsurance = fromEur(b.careInsurance);
    const annualPensionInsurance = fromEur(b.pensionInsurance);
    const annualUnemploymentInsurance = fromEur(b.unemploymentInsurance);
    const totalSocialSecurity = fromEur(b.totalSocial);
    const incomeTax = fromEur(b.incomeTax);
    const solidaritySurcharge = fromEur(b.soli);
    const churchTax = fromEur(b.churchTax);
    const totalDeductions = fromEur(b.totalDeductions);
    const netAnnual = fromEur(b.netAnnual);
    const netMonthly = netAnnual / 12;
    const effectiveTaxRate = b.effectiveRate;

    const expenses = parseFloat(monthlyExpenses) || 0;
    const disposableMonthly = netMonthly - expenses;
    const disposableAnnual = disposableMonthly * 12;

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
    netTarget,
    tradingDays,
    hoursPerDay,
    hasChurchTax,
    monthlyExpenses,
    employmentMode,
    isMarried,
    currency,
    eurUsdRate,
  ]);

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
      const grossMonthlyEur =
        currency === "USD" ? grossMonthly / (eurUsdRate ?? 1) : grossMonthly;
      const b = computeBreakdown(grossMonthlyEur * 12, {
        isFreelancer: employmentMode === "freelancer",
        married: isMarried,
        church: hasChurchTax,
      });
      return {
        grossMonthly,
        netMonthly:
          (currency === "USD" ? b.netAnnual * (eurUsdRate ?? 1) : b.netAnnual) / 12,
        grossAnnual:
          currency === "USD" ? b.grossAnnual * (eurUsdRate ?? 1) : b.grossAnnual,
        netAnnual:
          currency === "USD" ? b.netAnnual * (eurUsdRate ?? 1) : b.netAnnual,
        rate: b.effectiveRate,
      };
    });
  }, [calculations.monthly, employmentMode, isMarried, hasChurchTax, currency, eurUsdRate]);

  const currentLevelIdx = comparisonLevels.findIndex(
    (l) => l.grossMonthly === calculations.monthly,
  );

  const visibleLevels = comparisonLevels
    .map((level, idx) => ({ level, idx }))
    .filter(({ idx }) => showAllLevels || Math.abs(idx - currentLevelIdx) <= 1)
    .map((item, vIdx, arr) => ({
      ...item,
      prevVisibleNet: vIdx > 0 ? arr[vIdx - 1].level.netMonthly : null,
    }));

  const employmentComparison = useMemo(() => {
    const targetNetMonthly = calculations.netMonthly;
    const targetNetAnnual =
      (currency === "USD" ? targetNetMonthly / (eurUsdRate ?? 1) : targetNetMonthly) * 12;
    const married = isMarried;
    const church = hasChurchTax;

    const employeeGross = solveGrossForNet(targetNetAnnual, {
      isFreelancer: false,
      married,
      church,
    });
    const employerCost = employeeGross + computeEmployerSocial(employeeGross);

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
      employeeGross:
        currency === "USD" ? employeeGross * (eurUsdRate ?? 1) : employeeGross,
      employerCost:
        currency === "USD" ? employerCost * (eurUsdRate ?? 1) : employerCost,
      freelancerMatchNet:
        currency === "USD" ? freelancerMatchNet * (eurUsdRate ?? 1) : freelancerMatchNet,
      reserve: currency === "USD" ? reserve * (eurUsdRate ?? 1) : reserve,
    };
  }, [calculations.netMonthly, isMarried, hasChurchTax, currency, eurUsdRate]);

  const ec = employmentComparison;

  const payout = useMemo(
    () =>
      computePayoutPlan(
        currency === "EUR"
          ? calculations.monthly * (eurUsdRate ?? 1)
          : calculations.monthly,
        calculations.tradingDaysPerMonth,
        {
          accountSize: parseFloat(accountSize) || 0,
          profitSplit: (parseFloat(payoutSplitPct) || 0) / 100,
          profitReleaseRate: (parseFloat(profitReleasePct) || 0) / 100,
          maxPayoutPerAccount: parseFloat(maxPayoutPerAccount) || 0,
          minQualifyingDays: parseFloat(minQualifyingDays) || 0,
          minProfitPerQualifyingDay: parseFloat(minProfitPerDay) || 0,
          minCycleProfit: parseFloat(minCycleProfit) || 0,
          bufferPerAccount: parseFloat(bufferPerAccount) || 0,
        },
        {
          accounts: accountsOverride,
          dailyTarget: parseFloat(dailyPaceInput) || null,
        },
      ),
    [
      calculations.monthly,
      calculations.tradingDaysPerMonth,
      accountSize,
      payoutSplitPct,
      profitReleasePct,
      maxPayoutPerAccount,
      minQualifyingDays,
      minProfitPerDay,
      minCycleProfit,
      bufferPerAccount,
      accountsOverride,
      dailyPaceInput,
      currency,
      eurUsdRate,
    ],
  );

  const riskBand =
    payout.status === "ok"
      ? RISK_BANDS.find((b) => payout.dailyRiskPct <= b.max) ??
        RISK_BANDS[RISK_BANDS.length - 1]
      : null;

  // Fast-paced projection for an arbitrary account count — powers the accounts
  // stepper so dialing accounts up/down applies that count AND its fastest pace.
  const fastPaceForAccounts = (n: number) => {
    const accounts = Math.max(1, Math.floor(n));
    const targetUsd =
      currency === "EUR"
        ? calculations.monthly * (eurUsdRate ?? 1)
        : calculations.monthly;
    const rules = {
      accountSize: parseFloat(accountSize) || 0,
      profitSplit: (parseFloat(payoutSplitPct) || 0) / 100,
      profitReleaseRate: (parseFloat(profitReleasePct) || 0) / 100,
      maxPayoutPerAccount: parseFloat(maxPayoutPerAccount) || 0,
      minQualifyingDays: parseFloat(minQualifyingDays) || 0,
      minProfitPerQualifyingDay: parseFloat(minProfitPerDay) || 0,
      minCycleProfit: parseFloat(minCycleProfit) || 0,
      bufferPerAccount: parseFloat(bufferPerAccount) || 0,
    };
    const base = computePayoutPlan(
      targetUsd,
      calculations.tradingDaysPerMonth,
      rules,
      { accounts },
    );
    if (base.status !== "ok") return null;
    const dailyTarget = Math.ceil(base.fastTrackDaily);
    const paced = computePayoutPlan(
      targetUsd,
      calculations.tradingDaysPerMonth,
      rules,
      { accounts, dailyTarget },
    );
    const completionDay =
      paced.status === "ok" && paced.payoutEvents.length > 0
        ? Math.max(...paced.payoutEvents.map((e) => e.day))
        : 0;
    const dailyRiskPct =
      rules.accountSize > 0 ? (dailyTarget / rules.accountSize) * 100 : 0;
    const riskBand =
      RISK_BANDS.find((b) => dailyRiskPct <= b.max) ??
      RISK_BANDS[RISK_BANDS.length - 1];
    return {
      accounts,
      dailyTarget,
      completionDay,
      payouts: base.cyclesUsed,
      shortfall: base.shortfall,
      riskLabel: riskBand.label,
    };
  };
  return {
    currency,
    changeCurrency,
    eurUsdRate,
    rateDate,
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
    hasChurchTax,
    setHasChurchTax,
    monthlyExpenses,
    setMonthlyExpenses,
    employmentMode,
    setEmploymentMode,
    isMarried,
    setIsMarried,
    showAllLevels,
    setShowAllLevels,
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
    setAccountsOverride,
    applyPreset,
    firmPresets: FIRM_PRESETS,
    calculations,
    comparisonLevels,
    visibleLevels,
    ec,
    payout,
    riskBand,
    fastPaceForAccounts,
  };
}

export type IncomeTrackerModel = ReturnType<typeof useIncomeTracker>;
