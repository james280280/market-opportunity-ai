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
  if (available <= 0) return required <= 0 ? 100 : 0;
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
  unavailableSkills.forEach((skill) => availableSkills.delete(skill));
  return { availableSkills, unavailableSkills };
};

export const getUniqueEvidenceSignals = (evidenceItems: Evidence[]) => {
  const grouped = new Map<string, Evidence>();
  for (const evidence of evidenceItems) {
    const existing = grouped.get(evidence.signalGroup);
    if (!existing || evidence.confidence > existing.confidence) grouped.set(evidence.signalGroup, evidence);
  }
  return [...grouped.values()];
};

export const categoryLabels: Record<(typeof evaluationCategories)[number], string> = {
  demand: "ほしい人の多さ",
  growth: "これから伸びそうか",
  demandSupplyGap: "穴場度（需要に対して提供者が少ないか）",
  customerPain: "困りごとの強さ",
  competition: "競合の少なさ・入りやすさ",
  profitability: "利益の出しやすさ",
  acquisitionDifficulty: "お客さんの見つけやすさ",
  feasibility: "始めやすさ",
  durability: "長く続けやすさ",
  risk: "安全性（リスクが低いほど高得点）",
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
  return Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, value / total])) as CategoryWeights;
};

const calculateOpportunityScore = (market: MarketCandidate, weights: CategoryWeights) =>
  round(evaluationCategories.reduce((sum, category) => sum + market.categoryScores[category] * weights[category], 0));

const calculateFitBreakdown = (constraints: UserConstraints, market: MarketCandidate): FitBreakdown => {
  const { availableSkills, unavailableSkills } = getConstraintSkills(constraints);
  const requiredSkills = normalizeSkillList(market.requiredSkills);
  const matchedSkills = requiredSkills.filter((skill) => availableSkills.has(skill) && !unavailableSkills.has(skill)).length;

  const regionFit = constraints.region === "global"
    ? 100
    : market.regionFocus.includes(constraints.region)
      ? 100
      : market.regionFocus.includes("global")
        ? 70
        : 30;

  const businessModelFit = constraints.preferredBusinessModel === "any"
    ? 100
    : market.businessModels.includes(constraints.preferredBusinessModel)
      ? 100
      : 35;

  const tolerancePenalty = constraints.riskTolerance === "low" ? 1 : constraints.riskTolerance === "medium" ? 0.8 : 0.6;

  return {
    budgetFit: round(calculateCapacityFit(market.budgetRequired, constraints.budget)),
    teamFit: round(calculateCapacityFit(market.teamRequired, constraints.teamSize)),
    weeklyHoursFit: round(calculateCapacityFit(market.weeklyHoursRequired, constraints.weeklyHours)),
    timeframeFit: round(calculateCapacityFit(market.minimumDurationMonths, constraints.timeframeMonths)),
    skillFit: requiredSkills.length === 0 ? 100 : round((matchedSkills / requiredSkills.length) * 100),
    regionFit,
    businessModelFit,
    riskFit: round(clamp(100 - regulatoryRiskPenalty[market.regulatoryRisk] * tolerancePenalty)),
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
  const coveredSignals = uniqueEvidenceItems.filter((evidence) => evidence.facts.length > 0 || evidence.supportingEvidence.length > 0).length;
  return { evidenceConfidence, evidenceCoverage: round((coveredSignals / evaluationCategories.length) * 100) };
};

export const formatSkillName = (skill: string) => {
  const labels: Record<string, string> = {
    sales: "営業・人に提案する力",
    operations: "運営・作業を回す力",
    ai: "AIを使う力",
    product: "商品・サービスを考える力",
    hardware: "機械・端末を扱う知識",
    medical: "医療の専門知識",
  };
  return labels[skill] ?? skill;
};

export const screenMarket = (constraints: UserConstraints, market: MarketCandidate) => {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const { availableSkills, unavailableSkills } = getConstraintSkills(constraints);
  const requiredSkills = normalizeSkillList(market.requiredSkills);

  if (market.budgetRequired > constraints.budget) {
    warnings.push(`予算は少し足りません。小さく試す目安 ${formatCurrency(market.budgetRequired)} / あなたの予算 ${formatCurrency(constraints.budget)}`);
  }
  if (market.teamRequired > constraints.teamSize) {
    warnings.push(`人数が少し足りません。目安 ${market.teamRequired}人 / 今の人数 ${constraints.teamSize}人`);
  }
  if (market.weeklyHoursRequired > constraints.weeklyHours) {
    warnings.push(`使える時間が少し足りません。目安 週${market.weeklyHoursRequired}時間 / 今は週${constraints.weeklyHours}時間`);
  }
  if (market.minimumDurationMonths > constraints.timeframeMonths) {
    warnings.push(`希望期間より長めです。目安 ${market.minimumDurationMonths}か月 / 希望 ${constraints.timeframeMonths}か月`);
  }

  const blockedSkills = requiredSkills.filter((skill) => unavailableSkills.has(skill));
  const missingSkills = requiredSkills.filter((skill) => !availableSkills.has(skill) && !unavailableSkills.has(skill));
  if (missingSkills.length > 0) {
    warnings.push(`今から覚えると有利: ${missingSkills.map(formatSkillName).join("、")}`);
  }
  if (blockedSkills.length > 0) {
    reasons.push(`「やりたくない・できない」に入れた能力が必要: ${blockedSkills.map(formatSkillName).join("、")}`);
  }

  const normalizedExclusions = constraints.excludedMarkets.map((item) => normalizeLooseText(item)).filter(Boolean);
  const normalizedTags = [market.name, market.summary, market.targetCustomer, ...market.tags].map((item) => normalizeLooseText(item));
  const matchedExclusions = normalizedExclusions.filter((item) => normalizedTags.some((tag) => tag.includes(item)));
  if (matchedExclusions.length > 0) reasons.push(`候補から外したい分野に一致: ${matchedExclusions.join("、")}`);
  if (market.regulatoryRisk === "critical") reasons.push("法律・安全面のハードルが高く、初心者向け候補からは外します");

  return { passed: reasons.length === 0, reasons, warnings };
};

export const evaluateMarket = (constraints: UserConstraints, market: MarketCandidate): RankedMarket => {
  const categoryWeights = getCategoryWeights(constraints);
  const opportunityScore = calculateOpportunityScore(market, categoryWeights);
  const { fitScore, breakdown } = calculateFitScore(constraints, market);
  const { evidenceConfidence, evidenceCoverage } = calculateEvidenceMetrics(market);
  const screening = screenMarket(constraints, market);
  return {
    market,
    categoryWeights,
    opportunityScore,
    fitScore,
    evidenceConfidence,
    evidenceCoverage,
    rankingScore: round(opportunityScore * 0.6 + fitScore * 0.4),
    screening,
    fitBreakdown: breakdown,
  };
};

export const rankMarkets = (constraints: UserConstraints, markets: MarketCandidate[] = marketCandidates) => markets
  .map((market) => evaluateMarket(constraints, market))
  .sort((left, right) => {
    if (left.screening.passed !== right.screening.passed) return left.screening.passed ? -1 : 1;
    if (left.rankingScore !== right.rankingScore) return right.rankingScore - left.rankingScore;
    if (left.opportunityScore !== right.opportunityScore) return right.opportunityScore - left.opportunityScore;
    if (left.fitScore !== right.fitScore) return right.fitScore - left.fitScore;
    if (left.evidenceCoverage !== right.evidenceCoverage) return right.evidenceCoverage - left.evidenceCoverage;
    if (left.evidenceConfidence !== right.evidenceConfidence) return right.evidenceConfidence - left.evidenceConfidence;
    return left.market.id.localeCompare(right.market.id, "ja");
  });

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);

export const formatPercent = (value: number) => `${Math.round(value)}点`;
