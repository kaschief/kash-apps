import { useMemo, useState } from "react";
import {
  BUFFER_PCT_OF_ACCOUNT,
  FIRM_PRESETS,
  QUALIFYING_DAY_PCT,
  RISK_BANDS,
  computeBreakdown,
  computeEmployerSocial,
  computePayoutPlan,
  solveGrossForNet,
} from "../lib/domain";

export function useIncomeTracker() {
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
  const [maxPayoutPerAccount, setMaxPayoutPerAccount] = useState("2000");
  const [minQualifyingDays, setMinQualifyingDays] = useState("5");
  const [minProfitPerDay, setMinProfitPerDay] = useState("250");
  const [bufferPerAccount, setBufferPerAccount] = useState("1000");

  const applyPreset = (p: (typeof FIRM_PRESETS)[number]) => {
    setAccountSize(String(p.accountSize));
    setMaxPayoutPerAccount(String(p.maxPayout));
    setBufferPerAccount(String(p.accountSize * BUFFER_PCT_OF_ACCOUNT));
    setMinProfitPerDay(String(p.accountSize * QUALIFYING_DAY_PCT));
  };

  const calculations = useMemo(() => {
    const hours = parseFloat(hoursPerDay) || 1;
    const tradingDaysPerMonth = Math.min(
      23,
      Math.max(0, parseFloat(tradingDays) || 0),
    );

    let monthly;
    if (mode === "gross") {
      monthly = parseFloat(monthlyTarget) || 0;
    } else {
      const desiredNetMonthly = parseFloat(netTarget) || 0;
      monthly =
        solveGrossForNet(desiredNetMonthly * 12, {
          isFreelancer: employmentMode === "freelancer",
          married: isMarried,
          church: hasChurchTax,
        }) / 12;
    }
    const daily = tradingDaysPerMonth > 0 ? monthly / tradingDaysPerMonth : 0;

    const annual = monthly * 12;
    const weekly = (monthly * 12) / 52;
    const hourlyRate = hours > 0 ? daily / hours : 0;

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
    const targetNetAnnual = targetNetMonthly * 12;
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
      employeeGross,
      employerCost,
      freelancerMatchNet,
      reserve,
    };
  }, [calculations.netMonthly, isMarried, hasChurchTax]);

  const ec = employmentComparison;

  const payout = useMemo(
    () =>
      computePayoutPlan(
        calculations.monthly,
        calculations.tradingDaysPerMonth,
        {
          accountSize: parseFloat(accountSize) || 0,
          profitSplit: (parseFloat(payoutSplitPct) || 0) / 100,
          maxPayoutPerAccount: parseFloat(maxPayoutPerAccount) || 0,
          minQualifyingDays: parseFloat(minQualifyingDays) || 0,
          minProfitPerQualifyingDay: parseFloat(minProfitPerDay) || 0,
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
      maxPayoutPerAccount,
      minQualifyingDays,
      minProfitPerDay,
      bufferPerAccount,
      accountsOverride,
      dailyPaceInput,
    ],
  );

  const riskBand =
    payout.status === "ok"
      ? RISK_BANDS.find((b) => payout.dailyRiskPct <= b.max) ??
        RISK_BANDS[RISK_BANDS.length - 1]
      : null;
  return {
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
    maxPayoutPerAccount,
    setMaxPayoutPerAccount,
    minQualifyingDays,
    setMinQualifyingDays,
    minProfitPerDay,
    setMinProfitPerDay,
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
  };
}

export type IncomeTrackerModel = ReturnType<typeof useIncomeTracker>;
