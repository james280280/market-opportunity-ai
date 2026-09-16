import { marketCandidates } from "./data";
import { normalizeLooseText, normalizeSkillList } from "./normalize";
import {
  evaluationCategories,
  type CategoryWeights,
  type Evidence,
  type FitBreakdown,
  type MarketCandidate,
  type RankedMarket,
  type RegulatoryRisk,
  type UserConstraints,
} from "./types";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;
const calculateCapacityFit = (required: number, available: number) => {
  if (available <= 0) {
    return required <= 0 ? 100 : 0;
  }

  return required <= available ? 100 : clamp(100 - ((required - available) / available) * 100);
};

const regulatoryRiskPenalty: Record<RegulatoryRisk, number> = {
  low: 10,
  medium: 30,
  high: 55,
  critical: 90,
};

const getConstraintSkills = (constraints: UserConstraints) => {
  const availableSkills = new Set(normalizeSkillList(constraints.skills));
  const unavailableSkills = new Set(normalizeSkillList(constraints.unavailableSkills));

  unavailableSkills.forEach((skill) => {
    availableSkills.delete(skill);
  });

  return { availableSkills, unavailableSkills };
};

export const getUniqueEvidenceSignals = (evidenceItems: Evidence[]) => {
  const grouped = new Map<string, Evidence>();

  for (const evidence of evidenceItems) {
    const existing = grouped.get(evidence.signalGroup);
    if (!existing || evidence.confidence > existing.confidence) {
      grouped.set(evidence.signalGroup, evidence);
    }
  }

  return [...grouped.values()];
};

export const categoryLabels: Record<(typeof evaluationCategories)[number], string> = {
  demand: "需要",
  growth: "成長性",
  demandSupplyGap: "需要供給ギャップ",
  customerPain: "顧客課題の強さ",
  competition: "競争環境（参入しやすいほど高得点）",
  profitability: "収益性",
  acquisitionDifficulty: "顧客獲得難易度（低難易度ほど高得点）",
  feasibility: "参入実行可能性",
  durability: "持続性・防御力",
  risk: "リスク（低リスクほど高得点）",
};

export const getCategoryWeights = (constraints: UserConstraints): CategoryWeights => {
  const weights: CategoryWeights = {
    demand: 1,
    growth: 1,
    demandSupplyGap: 1,
    customerPain: 1,
    competition: 1,
    profitability: 1,
    acquisitionDifficulty: 1,
    feasibility: 1,
    durability: 1,
    risk: 1,
  };

  if (constraints.budget <= 10000000) {
    weights.feasibility += 0.6;
    weights.profitability += 0.25;
    weights.acquisitionDifficulty += 0.2;
  }

  if (constraints.teamSize <= 3) {
    weights.feasibility += 0.35;
    weights.acquisitionDifficulty += 0.15;
  }

  if (constraints.weeklyHours <= 20) {
    weights.feasibility += 0.4;
    weights.acquisitionDifficulty += 0.15;
  }

  if (constraints.timeframeMonths <= 6) {
    weights.feasibility += 0.45;
    weights.demand += 0.2;
    weights.demandSupplyGap += 0.15;
  }

  if (constraints.targetMonthlyRevenue >= 1000000) {
    weights.demand += 0.2;
    weights.growth += 0.25;
    weights.profitability += 0.3;
    weights.durability += 0.1;
  }

  if (constraints.preferredBusinessModel !== "any") {
    weights.profitability += 0.15;
    weights.acquisitionDifficulty += 0.1;
  }

  if (constraints.riskTolerance === "low") {
    weights.risk += 0.75;
    weights.durability += 0.35;
    weights.competition += 0.15;
  } else if (constraints.riskTolerance === "high") {
    weights.growth += 0.2;
    weights.demandSupplyGap += 0.15;
    weights.customerPain += 0.1;
  }

  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);

  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value / total]),
  ) as CategoryWeights;
};

const calculateOpportunityScore = (market: MarketCandidate, weights: CategoryWeights) => {
  return round(
    evaluationCategories.reduce((sum, category) => sum + market.categoryScores[category] * weights[category], 0),
  );
};

const calculateFitBreakdown = (constraints: UserConstraints, market: MarketCandidate): FitBreakdown => {
  const { availableSkills, unavailableSkills } = getConstraintSkills(constraints);
  const requiredSkills = normalizeSkillList(market.requiredSkills);
  const budgetFit = calculateCapacityFit(market.budgetRequired, constraints.budget);

  const teamFit = calculateCapacityFit(market.teamRequired, constraints.teamSize);

  const weeklyHoursFit = calculateCapacityFit(market.weeklyHoursRequired, constraints.weeklyHours);

  const timeframeFit = calculateCapacityFit(market.minimumDurationMonths, constraints.timeframeMonths);

  const matchedSkills = requiredSkills.filter(
    (skill) => availableSkills.has(skill) && !unavailableSkills.has(skill),
  ).length;
  const skillFit = requiredSkills.length === 0 ? 100 : round((matchedSkills / requiredSkills.length) * 100);

  const regionFit =
    constraints.region === "global"
      ? 100
      : market.regionFocus.includes(constraints.region)
        ? 100
        : market.regionFocus.includes("global")
          ? 70
          : 30;

  const businessModelFit =
    constraints.preferredBusinessModel === "any"
      ? 100
      : market.businessModels.includes(constraints.preferredBusinessModel)
        ? 100
        : 35;

  const tolerancePenalty =
    constraints.riskTolerance === "low"
      ? 1
      : constraints.riskTolerance === "medium"
        ? 0.8
        : 0.6;
  const riskFit = clamp(100 - regulatoryRiskPenalty[market.regulatoryRisk] * tolerancePenalty);

  return {
    budgetFit: round(budgetFit),
    teamFit: round(teamFit),
    weeklyHoursFit: round(weeklyHoursFit),
    timeframeFit: round(timeframeFit),
    skillFit,
    regionFit,
    businessModelFit,
    riskFit: round(riskFit),
  };
};

export const calculateFitScore = (constraints: UserConstraints, market: MarketCandidate) => {
  const breakdown = calculateFitBreakdown(constraints, market);
  const fitScore = round(
    breakdown.budgetFit * 0.2 +
      breakdown.teamFit * 0.15 +
      breakdown.weeklyHoursFit * 0.1 +
      breakdown.timeframeFit * 0.1 +
      breakdown.skillFit * 0.2 +
      breakdown.regionFit * 0.1 +
      breakdown.businessModelFit * 0.1 +
      breakdown.riskFit * 0.05,
  );

  return { fitScore, breakdown };
};

export const calculateEvidenceMetrics = (market: MarketCandidate) => {
  const evidenceItems = evaluationCategories.map((category) => market.categoryEvidence[category]);
  const uniqueEvidenceItems = getUniqueEvidenceSignals(evidenceItems);
  const evidenceConfidence = uniqueEvidenceItems.length === 0
    ? 0
    : round(uniqueEvidenceItems.reduce((sum, evidence) => sum + evidence.confidence, 0) / uniqueEvidenceItems.length);
  const coveredSignals = uniqueEvidenceItems.filter(
    (evidence) => evidence.facts.length > 0 || evidence.supportingEvidence.length > 0,
  ).length;
  const evidenceCoverage = round((coveredSignals / evaluationCategories.length) * 100);

  return { evidenceConfidence, evidenceCoverage };
};

export const screenMarket = (constraints: UserConstraints, market: MarketCandidate) => {
  const reasons: string[] = [];
  const { availableSkills, unavailableSkills } = getConstraintSkills(constraints);
  const requiredSkills = normalizeSkillList(market.requiredSkills);

  if (market.budgetRequired > constraints.budget) {
    reasons.push(`予算超過: 必要 ${formatCurrency(market.budgetRequired)} / 上限 ${formatCurrency(constraints.budget)}`);
  }

  if (market.teamRequired > constraints.teamSize) {
    reasons.push(`人数超過: 必要 ${market.teamRequired}人 / 上限 ${constraints.teamSize}人`);
  }

  if (market.weeklyHoursRequired > constraints.weeklyHours) {
    reasons.push(`週投入時間不足: 必要 ${market.weeklyHoursRequired}時間 / 上限 ${constraints.weeklyHours}時間`);
  }

  if (market.minimumDurationMonths > constraints.timeframeMonths) {
    reasons.push(`期間超過: 必要 ${market.minimumDurationMonths}か月 / 上限 ${constraints.timeframeMonths}か月`);
  }

  const blockedSkills = requiredSkills.filter((skill) => unavailableSkills.has(skill));
  const missingSkills = requiredSkills.filter((skill) => !availableSkills.has(skill) && !unavailableSkills.has(skill));
  if (missingSkills.length > 0) {
    reasons.push(`必須スキル不足: ${missingSkills.join(", ")}`);
  }

  if (blockedSkills.length > 0) {
    reasons.push(`未保有スキルに該当: ${blockedSkills.join(", ")}`);
  }

  const normalizedExclusions = constraints.excludedMarkets.map((item) => normalizeLooseText(item)).filter(Boolean);
  const normalizedTags = [market.name, market.summary, market.targetCustomer, ...market.tags].map((item) => normalizeLooseText(item));
  const matchedExclusions = normalizedExclusions.filter((item) => normalizedTags.some((tag) => tag.includes(item)));
  if (matchedExclusions.length > 0) {
    reasons.push(`除外市場に該当: ${matchedExclusions.join(", ")}`);
  }

  if (market.regulatoryRisk === "critical") {
    reasons.push("重大法規制リスク: MVP段階では取り扱い対象外");
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
};

export const evaluateMarket = (constraints: UserConstraints, market: MarketCandidate): RankedMarket => {
  const categoryWeights = getCategoryWeights(constraints);
  const opportunityScore = calculateOpportunityScore(market, categoryWeights);
  const { fitScore, breakdown } = calculateFitScore(constraints, market);
  const { evidenceConfidence, evidenceCoverage } = calculateEvidenceMetrics(market);
  const screening = screenMarket(constraints, market);
  const rankingScore = round(opportunityScore * 0.6 + fitScore * 0.4);

  return {
    market,
    categoryWeights,
    opportunityScore,
    fitScore,
    evidenceConfidence,
    evidenceCoverage,
    rankingScore,
    screening,
    fitBreakdown: breakdown,
  };
};

export const rankMarkets = (constraints: UserConstraints, markets: MarketCandidate[] = marketCandidates) => {
  return markets
    .map((market) => evaluateMarket(constraints, market))
    .sort((left, right) => {
      if (left.screening.passed !== right.screening.passed) {
        return left.screening.passed ? -1 : 1;
      }
      if (left.rankingScore !== right.rankingScore) {
        return right.rankingScore - left.rankingScore;
      }
      if (left.opportunityScore !== right.opportunityScore) {
        return right.opportunityScore - left.opportunityScore;
      }
      if (left.fitScore !== right.fitScore) {
        return right.fitScore - left.fitScore;
      }
      if (left.evidenceCoverage !== right.evidenceCoverage) {
        return right.evidenceCoverage - left.evidenceCoverage;
      }
      if (left.evidenceConfidence !== right.evidenceConfidence) {
        return right.evidenceConfidence - left.evidenceConfidence;
      }
      return left.market.id.localeCompare(right.market.id, "ja");
    });
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);

export const formatPercent = (value: number) => `${Math.round(value)}点`;
