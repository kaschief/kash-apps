
const TAX_FREE_ALLOWANCE = 12348;
const ZONE_2_END = 17443;
const ZONE_3_END = 69000;
const ZONE_4_END = 277825;
const TOP_TAX_RATE = 0.45;
const HIGH_TAX_RATE = 0.42;

const ZONE_2_COEF_A = 922.98;
const ZONE_2_COEF_B = 1400;
const ZONE_3_COEF_A = 176.02;
const ZONE_3_COEF_B = 2397;
const ZONE_3_OFFSET = 1015.13;
const ZONE_4_OFFSET = 10602.13;
const ZONE_5_OFFSET = 18936.88;

const SOLI_RATE = 0.055;
const SOLI_THRESHOLD = 18130;
const CHURCH_TAX_RATE = 0.09;

const HEALTH_INSURANCE_BASE_RATE = 0.146;
const HEALTH_INSURANCE_ADDITIONAL = 0.025;
const HEALTH_INSURANCE_TOTAL =
  HEALTH_INSURANCE_BASE_RATE + HEALTH_INSURANCE_ADDITIONAL;
const CARE_INSURANCE_RATE = 0.036;
const PENSION_INSURANCE_RATE = 0.186;
const UNEMPLOYMENT_INSURANCE_RATE = 0.026;

const HEALTH_INSURANCE_CEILING = 69750;
const PENSION_INSURANCE_CEILING = 101400;

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

export function computeBreakdown(grossAnnual: number, opts: TaxOpts): Breakdown {
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

export function computeEmployerSocial(grossAnnual: number): number {
  const healthCareBase = Math.min(grossAnnual, HEALTH_INSURANCE_CEILING);
  const pensionBase = Math.min(grossAnnual, PENSION_INSURANCE_CEILING);
  return (
    healthCareBase * (HEALTH_INSURANCE_TOTAL / 2) +
    healthCareBase * (CARE_INSURANCE_RATE / 2) +
    pensionBase * (PENSION_INSURANCE_RATE / 2) +
    pensionBase * (UNEMPLOYMENT_INSURANCE_RATE / 2)
  );
}

export function solveGrossForNet(targetNetAnnual: number, opts: TaxOpts): number {
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


interface FirmRules {
  accountSize: number;
  profitSplit: number;
  maxPayoutPerAccount: number;
  minQualifyingDays: number;
  minProfitPerQualifyingDay: number;
  bufferPerAccount: number;
}

export const FIRM_PRESETS = [
  { label: "25K", accountSize: 25000, maxPayout: 1000 },
  { label: "50K", accountSize: 50000, maxPayout: 2000 },
  { label: "100K", accountSize: 100000, maxPayout: 4000 },
  { label: "150K", accountSize: 150000, maxPayout: 6000 },
] as const;

export const BUFFER_PCT_OF_ACCOUNT = 0.02;
export const QUALIFYING_DAY_PCT = 0.005;

export const RISK_BANDS = [
  { max: 1, label: "conservative" },
  { max: 2, label: "moderate" },
  { max: Infinity, label: "aggressive" },
] as const;

interface PayoutEvent {
  index: number;
  day: number;
  perAccountProfit: number;
  cash: number;
  balanceAfter: number;
  beyondMonth: boolean;
}

interface PlanOverrides {
  accounts?: number | null;
  dailyTarget?: number | null;
}

interface Scenario {
  accounts: number;
  perAccountDaily: number;
  totalCash: number;
  maxCash: number;
  shortfall: number;
}

type PayoutPlan =
  | { status: "invalid" }
  | {
      status: "ok";
      incomeTarget: number;
      withdrawProfit: number;
      accountsNeeded: number;
      recommendedAccounts: number;
      accountsForced: boolean;
      totalCash: number;
      shortfall: number;
      maxCash: number;
      cyclesUsed: number;
      payoutEvents: PayoutEvent[];
      perAccountWithdraw: number;
      perAccountEarnBuild: number;
      perAccountEarnSteady: number;
      dailyPace: number;
      paceForced: boolean;
      dailyNeeded: number;
      perAccountDailySteady: number;
      dailyRiskPct: number;
      checks: {
        requiredDays: number;
        daysOk: boolean;
        daySizeOk: boolean;
        greenDaysNeeded: number;
        capOk: boolean;
        paceOk: boolean;
        valid: boolean;
      };
      scenarios: Scenario[];
    };

export function computePayoutPlan(
  incomeTarget: number,
  tradingDays: number,
  rules: FirmRules,
  overrides: PlanOverrides = {},
): PayoutPlan {
  if (incomeTarget <= 0 || rules.profitSplit <= 0) return { status: "invalid" };

  const withdrawProfit = incomeTarget / rules.profitSplit;
  const cap =
    rules.maxPayoutPerAccount > 0 ? rules.maxPayoutPerAccount : Infinity;
  const minDays = Math.max(0, rules.minQualifyingDays);
  const buffer = Math.max(0, rules.bufferPerAccount);

  const cyclesAvailable =
    minDays > 0 ? Math.max(1, Math.floor(tradingDays / minDays)) : 1;
  const releasablePerAccount = Number.isFinite(cap)
    ? cap * cyclesAvailable
    : Infinity;
  const recommendedAccounts = Number.isFinite(releasablePerAccount)
    ? Math.max(1, Math.ceil(withdrawProfit / releasablePerAccount))
    : 1;

  const accountsNeeded =
    overrides.accounts && overrides.accounts >= 1
      ? Math.floor(overrides.accounts)
      : recommendedAccounts;
  const accountsForced = accountsNeeded !== recommendedAccounts;

  const perAccountWithdraw = Math.min(
    withdrawProfit / accountsNeeded,
    releasablePerAccount,
  );
  const totalCash = perAccountWithdraw * rules.profitSplit * accountsNeeded;
  const rawShortfall = incomeTarget - totalCash;
  const shortfall = rawShortfall > 0.005 ? rawShortfall : 0;

  const cyclesUsed = Number.isFinite(cap)
    ? Math.max(1, Math.ceil(perAccountWithdraw / cap))
    : 1;
  const perAccountEarnBuild = perAccountWithdraw + buffer;
  const perAccountEarnSteady = perAccountWithdraw;

  const daily = (profit: number) =>
    tradingDays > 0 ? profit / tradingDays : 0;
  const dailyNeeded = daily(perAccountEarnBuild);
  const paceForced = !!overrides.dailyTarget && overrides.dailyTarget > 0;
  const dailyPace = paceForced ? overrides.dailyTarget! : dailyNeeded;

  const payoutEvents: PayoutEvent[] = [];
  let cumWithdraw = 0;
  for (let k = 1; k <= cyclesUsed; k++) {
    const prev = cumWithdraw;
    cumWithdraw = Math.min(
      Number.isFinite(cap) ? k * cap : perAccountWithdraw,
      perAccountWithdraw,
    );
    const perAccountProfit = cumWithdraw - prev;
    const dayByEarnings =
      dailyPace > 0 ? Math.ceil((cumWithdraw + buffer) / dailyPace) : 1;
    const day = Math.max(k * minDays, dayByEarnings, 1);
    payoutEvents.push({
      index: k,
      day,
      perAccountProfit,
      cash: perAccountProfit * rules.profitSplit * accountsNeeded,
      balanceAfter: rules.accountSize + dailyPace * day - cumWithdraw,
      beyondMonth: day > tradingDays,
    });
  }

  const scenarioFor = (accounts: number): Scenario => {
    const perWithdraw = withdrawProfit / accounts;
    const released = Math.min(perWithdraw, releasablePerAccount);
    const cash = released * rules.profitSplit * accounts;
    const raw = incomeTarget - cash;
    return {
      accounts,
      perAccountDaily: daily(released + buffer),
      totalCash: cash,
      maxCash: Number.isFinite(releasablePerAccount)
        ? releasablePerAccount * rules.profitSplit * accounts
        : cash,
      shortfall: raw > 0.005 ? raw : 0,
    };
  };

  const candidates = (
    recommendedAccounts === 1
      ? [1, 2, 3]
      : [
          recommendedAccounts - 1,
          recommendedAccounts,
          recommendedAccounts + 1,
          recommendedAccounts + 2,
        ]
  ).concat(accountsNeeded);
  const scenarios = [...new Set(candidates)]
    .filter((n) => n >= 1)
    .sort((a, b) => a - b)
    .map(scenarioFor);

  const minQual = Math.max(0, rules.minProfitPerQualifyingDay);
  const requiredDays = cyclesUsed * minDays;
  const daysOk = minDays <= 0 || tradingDays >= requiredDays;
  const daySizeOk = minQual <= 0 || dailyPace >= minQual;
  const capOk = shortfall === 0;
  const paceOk = dailyPace * tradingDays >= perAccountEarnBuild - 0.005;

  return {
    status: "ok",
    incomeTarget,
    withdrawProfit,
    accountsNeeded,
    recommendedAccounts,
    accountsForced,
    totalCash,
    shortfall,
    maxCash: Number.isFinite(releasablePerAccount)
      ? releasablePerAccount * rules.profitSplit * accountsNeeded
      : totalCash,
    cyclesUsed,
    payoutEvents,
    perAccountWithdraw,
    perAccountEarnBuild,
    perAccountEarnSteady,
    dailyPace,
    paceForced,
    dailyNeeded,
    perAccountDailySteady: daily(perAccountEarnSteady),
    dailyRiskPct:
      rules.accountSize > 0 ? (dailyPace / rules.accountSize) * 100 : 0,
    checks: {
      requiredDays,
      daysOk,
      daySizeOk,
      greenDaysNeeded:
        minQual > 0
          ? Math.max(requiredDays, Math.ceil(perAccountEarnBuild / minQual))
          : 0,
      capOk,
      paceOk,
      valid: daysOk && daySizeOk && capOk && paceOk,
    },
    scenarios,
  };
}
