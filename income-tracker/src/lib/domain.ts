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

export function computeBreakdown(
  grossAnnual: number,
  opts: TaxOpts,
): Breakdown {
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

export function solveGrossForNet(
  targetNetAnnual: number,
  opts: TaxOpts,
): number {
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
  profitReleaseRate: number;
  maxPayoutPerAccount: number;
  minQualifyingDays: number;
  minProfitPerQualifyingDay: number;
  minCycleProfit: number;
  bufferPerAccount: number;
}

export const FIRM_PRESETS = [
  {
    label: "25K",
    accountSize: 25000,
    maxPayout: 1000,
    minDailyProfit: 100,
    bufferPerAccount: 2000,
    accountFee: 150,
  },
  {
    label: "50K",
    accountSize: 50000,
    maxPayout: 2000,
    minDailyProfit: 150,
    bufferPerAccount: 2000,
    accountFee: 170,
  },
  {
    label: "100K",
    accountSize: 100000,
    maxPayout: 2500,
    minDailyProfit: 200,
    bufferPerAccount: 2000,
    accountFee: 200,
  },
  {
    label: "150K",
    accountSize: 150000,
    maxPayout: 3000,
    minDailyProfit: 250,
    bufferPerAccount: 3000,
    accountFee: 260,
  },
] as const;

export const RISK_BANDS = [
  { max: 1, label: "conservative" },
  { max: 2, label: "moderate" },
  { max: Infinity, label: "aggressive" },
] as const;

interface PayoutEvent {
  index: number;
  day: number;
  qualifyingDay: number;
  profitDay: number;
  perAccountProfit: number;
  cycleProfit: number;
  cumulativeProfit: number; // total profit one account must have earned by now (incl. buffer)
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
  perAccountDaily: number; // steady pace: earn the target over every trading day
  fastDaily: number; // fast pace: unlock every payout on its earliest rule day
  perAccountTarget: number; // total one account must earn this month (incl. buffer)
  completionDay: number; // trading day the whole target is out, at fast pace
  dailyRiskPct: number; // fast daily pace as % of account size
  riskLabel: string; // conservative / moderate / aggressive
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
      fastTrackDaily: number;
      perAccountDailySteady: number;
      dailyRiskPct: number;
      checks: {
        requiredDays: number;
        daysOk: boolean;
        daySizeOk: boolean;
        greenDaysNeeded: number;
        capOk: boolean;
        paceOk: boolean;
        cycleProfitOk: boolean;
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
  const releaseRate = Math.min(1, Math.max(0, rules.profitReleaseRate));
  if (releaseRate <= 0) return { status: "invalid" };
  const minDays = Math.max(0, rules.minQualifyingDays);
  const minCycleProfit = Math.max(0, rules.minCycleProfit);
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
  const requiredProfit = (withdrawal: number) =>
    Math.max(minCycleProfit, withdrawal / releaseRate);
  const requiredProfitForTotal = (withdrawal: number) => {
    if (!Number.isFinite(cap)) return requiredProfit(withdrawal);
    let remaining = withdrawal;
    let total = 0;
    while (remaining > 0.005) {
      const request = Math.min(remaining, cap);
      total += requiredProfit(request);
      remaining -= request;
    }
    return total;
  };
  const perAccountEarnSteady = requiredProfitForTotal(perAccountWithdraw);
  const perAccountEarnBuild = perAccountEarnSteady + buffer;

  const daily = (profit: number) =>
    tradingDays > 0 ? profit / tradingDays : 0;
  const dailyNeeded = daily(perAccountEarnBuild);
  const paceForced = !!overrides.dailyTarget && overrides.dailyTarget > 0;
  const dailyPace = paceForced ? overrides.dailyTarget! : dailyNeeded;

  const payoutEvents: PayoutEvent[] = [];
  let cumWithdraw = 0;
  let cumulativeRequiredProfit = buffer;
  let fastTrackDaily = 0;
  for (let k = 1; k <= cyclesUsed; k++) {
    const prev = cumWithdraw;
    cumWithdraw = Math.min(
      Number.isFinite(cap) ? k * cap : perAccountWithdraw,
      perAccountWithdraw,
    );
    const perAccountProfit = cumWithdraw - prev;
    const cycleProfit = requiredProfit(perAccountProfit);
    cumulativeRequiredProfit += cycleProfit;
    const dayByEarnings =
      dailyPace > 0 ? Math.ceil(cumulativeRequiredProfit / dailyPace) : 1;
    const qualifyingDay = Math.max(k * minDays, 1);
    fastTrackDaily = Math.max(
      fastTrackDaily,
      cumulativeRequiredProfit / qualifyingDay,
    );
    const day = Math.max(qualifyingDay, dayByEarnings);
    payoutEvents.push({
      index: k,
      day,
      qualifyingDay,
      profitDay: dayByEarnings,
      perAccountProfit,
      cycleProfit,
      cumulativeProfit: cumulativeRequiredProfit,
      cash: perAccountProfit * rules.profitSplit * accountsNeeded,
      balanceAfter: rules.accountSize + dailyPace * day - cumWithdraw,
      beyondMonth: day > tradingDays,
    });
  }

  // Fast-track pace + completion day for a given per-account withdrawal. At the
  // fast pace, every payout lands on its earliest rule day, so the whole target
  // is out on the last cycle's qualifying day. Fewer cycles = fewer days.
  const simulateFast = (perWithdraw: number) => {
    const cycles = Number.isFinite(cap)
      ? Math.max(1, Math.ceil(perWithdraw / cap))
      : 1;
    let cumWithdraw = 0;
    let cumRequired = buffer;
    let fastDaily = 0;
    for (let k = 1; k <= cycles; k++) {
      const prev = cumWithdraw;
      cumWithdraw = Math.min(
        Number.isFinite(cap) ? k * cap : perWithdraw,
        perWithdraw,
      );
      cumRequired += requiredProfit(cumWithdraw - prev);
      const qualifyingDay = Math.max(k * minDays, 1);
      fastDaily = Math.max(fastDaily, cumRequired / qualifyingDay);
    }
    return { fastDaily, completionDay: Math.max(cycles * minDays, 1) };
  };

  const scenarioFor = (accounts: number): Scenario => {
    const perWithdraw = withdrawProfit / accounts;
    const released = Math.min(perWithdraw, releasablePerAccount);
    const cash = released * rules.profitSplit * accounts;
    const raw = incomeTarget - cash;
    const fast = simulateFast(released);
    const fastDaily = Math.ceil(fast.fastDaily);
    const dailyRiskPct =
      rules.accountSize > 0 ? (fastDaily / rules.accountSize) * 100 : 0;
    const riskLabel = (
      RISK_BANDS.find((b) => dailyRiskPct <= b.max) ??
      RISK_BANDS[RISK_BANDS.length - 1]
    ).label;
    return {
      accounts,
      perAccountDaily: daily(requiredProfitForTotal(released) + buffer),
      fastDaily,
      perAccountTarget: requiredProfitForTotal(released) + buffer,
      completionDay: fast.completionDay,
      dailyRiskPct,
      riskLabel,
      totalCash: cash,
      maxCash: Number.isFinite(releasablePerAccount)
        ? releasablePerAccount * rules.profitSplit * accounts
        : cash,
      shortfall: raw > 0.005 ? raw : 0,
    };
  };

  // Smallest account count that fits the whole withdrawal in one payout each —
  // the fewest-calendar-days option — always offered alongside the neighbours.
  const singleCycleAccounts = Number.isFinite(cap)
    ? Math.max(1, Math.ceil(withdrawProfit / cap))
    : 1;
  const candidates = (
    recommendedAccounts === 1
      ? [1, 2, 3]
      : [
          recommendedAccounts - 1,
          recommendedAccounts,
          recommendedAccounts + 1,
          recommendedAccounts + 2,
        ]
  ).concat(accountsNeeded, singleCycleAccounts);
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
  const cycleProfitOk = payoutEvents.every(
    (event) => event.cycleProfit >= minCycleProfit,
  );

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
    fastTrackDaily,
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
      cycleProfitOk,
      valid: daysOk && daySizeOk && capOk && paceOk && cycleProfitOk,
    },
    scenarios,
  };
}

// ── Account-size optimizer ─────────────────────────────────────────────────
// Given one income target, rank candidate account sizes by the cash you keep
// AFTER the firm's account fee — the tradeoff the payout plan alone can't see.
// Every candidate reuses computePayoutPlan with the SHARED rules (split,
// release, min days) but its own size-specific cap/buffer/min-day and account
// fee, then we score the recommended-accounts plan for each.

export interface AccountCandidate {
  label: string;
  accountSize: number;
  cap: number;
  minDailyProfit: number;
  buffer: number;
  accountFee: number; // one-time fee to buy ONE account of this size (USD)
}

export interface SharedRules {
  profitSplit: number;
  profitReleaseRate: number;
  minQualifyingDays: number;
  minCycleProfit: number;
}

export interface OptimizerRow {
  label: string;
  accountSize: number;
  accountsNeeded: number;
  valid: boolean; // reaches target AND passes every firm rule
  shortfall: number;
  profitPerAccount: number; // monthly profit each account must generate
  totalProfit: number; // across all accounts
  dailyPace: number; // per account, fast-track
  dailyRiskPct: number;
  riskLabel: string;
  completionDay: number; // trading days until the whole target is out
  cyclesUsed: number; // payout requests per account
  grossCash: number; // cash received before account fees (firm split applied)
  totalCost: number; // accountFee × accountsNeeded — one-time, not recurring
  netAfterFees: number; // grossCash − totalCost (default ranking dimension)
  efficiency: number; // netAfterFees ÷ totalProfit, 0..1 — cash kept per $ ground out
}

export interface OptimizerResult {
  rows: OptimizerRow[]; // one per candidate, in natural size order
}

// The dimensions a trader might legitimately optimise for. "kept" maximises
// take-home cash; the rest minimise how demanding the plan is (a lower daily
// pace, a smaller per-account aim, or less risk can each justify a size).
export type OptimizerCriterion = "kept" | "eff" | "pace" | "aim" | "risk";

interface CriterionSpec {
  value: (row: OptimizerRow) => number;
  higherIsBetter: boolean;
}

const CRITERIA: Record<OptimizerCriterion, CriterionSpec> = {
  kept: { value: (r) => r.netAfterFees, higherIsBetter: true },
  eff: { value: (r) => r.efficiency, higherIsBetter: true },
  pace: { value: (r) => r.dailyPace, higherIsBetter: false },
  aim: { value: (r) => r.profitPerAccount, higherIsBetter: false },
  risk: { value: (r) => r.dailyRiskPct, higherIsBetter: false },
};

export interface RankedOptimizer {
  rows: OptimizerRow[]; // best-first for the chosen criterion, invalid last
  bestLabel: string | null; // top VALID row, or null if none reaches target
}

/**
 * Orders the candidate rows for a chosen criterion. Invalid plans (can't reach
 * the target) always sort last so their shortfall stays visible. Ties fall back
 * to cash kept, then fewer days in market — a stable, sensible ordering.
 */
export function rankOptimizerRows(
  rows: OptimizerRow[],
  criterion: OptimizerCriterion,
): RankedOptimizer {
  const { value, higherIsBetter } = CRITERIA[criterion];
  const dir = higherIsBetter ? -1 : 1;
  const sorted = [...rows].sort((a, b) => {
    if (a.valid !== b.valid) return a.valid ? -1 : 1;
    return (
      dir * (value(a) - value(b)) ||
      b.netAfterFees - a.netAfterFees ||
      a.completionDay - b.completionDay
    );
  });
  const best = sorted.find((r) => r.valid) ?? null;
  return { rows: sorted, bestLabel: best?.label ?? null };
}

export function optimizeAccountPlan(
  incomeTarget: number,
  tradingDays: number,
  shared: SharedRules,
  candidates: AccountCandidate[],
): OptimizerResult {
  const rows = candidates.map((c): OptimizerRow => {
    const plan = computePayoutPlan(incomeTarget, tradingDays, {
      accountSize: c.accountSize,
      profitSplit: shared.profitSplit,
      profitReleaseRate: shared.profitReleaseRate,
      maxPayoutPerAccount: c.cap,
      minQualifyingDays: shared.minQualifyingDays,
      minProfitPerQualifyingDay: c.minDailyProfit,
      minCycleProfit: shared.minCycleProfit,
      bufferPerAccount: c.buffer,
    });

    if (plan.status !== "ok") {
      return {
        label: c.label,
        accountSize: c.accountSize,
        accountsNeeded: 0,
        valid: false,
        shortfall: incomeTarget,
        profitPerAccount: 0,
        totalProfit: 0,
        dailyPace: 0,
        dailyRiskPct: 0,
        riskLabel: RISK_BANDS[RISK_BANDS.length - 1].label,
        completionDay: 0,
        cyclesUsed: 0,
        grossCash: 0,
        totalCost: c.accountFee,
        netAfterFees: -c.accountFee,
        efficiency: 0,
      };
    }

    // The recommended-accounts scenario carries the fast-track pace, days and
    // risk for the plan the trader would actually run.
    const scenario =
      plan.scenarios.find((s) => s.accounts === plan.accountsNeeded) ?? null;
    // One-time fee per account bought — charged once for each of the accounts
    // this size needs, not per month.
    const totalCost = c.accountFee * plan.accountsNeeded;
    const grossCash = plan.totalCash;
    const totalProfit = plan.perAccountEarnBuild * plan.accountsNeeded;
    const netAfterFees = grossCash - totalCost;

    return {
      label: c.label,
      accountSize: c.accountSize,
      accountsNeeded: plan.accountsNeeded,
      valid: plan.checks.valid,
      shortfall: plan.shortfall,
      profitPerAccount: plan.perAccountEarnBuild,
      totalProfit,
      dailyPace: scenario ? scenario.fastDaily : plan.dailyPace,
      dailyRiskPct: scenario ? scenario.dailyRiskPct : plan.dailyRiskPct,
      riskLabel: scenario
        ? scenario.riskLabel
        : (RISK_BANDS.find((b) => plan.dailyRiskPct <= b.max) ??
            RISK_BANDS[RISK_BANDS.length - 1]).label,
      completionDay: scenario ? scenario.completionDay : 0,
      cyclesUsed: plan.cyclesUsed,
      grossCash,
      totalCost,
      netAfterFees,
      efficiency: totalProfit > 0 ? netAfterFees / totalProfit : 0,
    };
  });

  return { rows };
}
