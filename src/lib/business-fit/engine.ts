import type {
  BusinessCandidate,
  BusinessDiscoveryMode,
  BusinessFitBreakdown,
  BusinessProfile,
  RankedBusiness,
  RiskTolerance,
} from "./types";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;

const capacityFit = (required: number, available: number) => {
  if (required <= available) return 100;
  if (available <= 0) return 0;
  return clamp(100 - ((required - available) / available) * 100);
};

const intensityFit = (intensity: number, comfort: number) => {
  if (comfort >= intensity) return 100;
  return clamp(100 - (intensity - comfort) * 25);
};

const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, "").trim();
const riskRank: Record<RiskTolerance, number> = { low: 1, medium: 2, high: 3 };

const calculateRiskFit = (profile: BusinessProfile, business: BusinessCandidate) => {
  const gap = riskRank[business.riskLevel] - riskRank[profile.riskTolerance];
  return gap <= 0 ? 100 : clamp(100 - gap * 35);
};

const calculateInterestFit = (profile: BusinessProfile, business: BusinessCandidate) => {
  const searchable = normalize([business.name, business.category, ...business.tags].join(" "));
  const signals = [...profile.interests, profile.freeText]
    .map(normalize)
    .filter((value) => value.length >= 2);

  if (signals.length === 0) return 70;
  const matches = signals.filter(
    (signal) => searchable.includes(signal) || business.tags.some((tag) => signal.includes(normalize(tag))),
  );
  return matches.length === 0 ? 55 : clamp(70 + Math.min(matches.length, 3) * 10);
};

const calculateOperatingStyleFit = (profile: BusinessProfile, business: BusinessCandidate) => {
  let score = 100;
  if (profile.solo && business.minimumTeamSize > 1) score -= 50;
  if (!profile.inventoryOkay && business.inventoryRequired) score -= 70;
  if (!profile.faceOnCameraOkay && business.faceOnCameraRequired) score -= 70;
  if (!profile.localServiceOkay && business.localServiceRequired) score -= 60;
  return clamp(score);
};

const calculateBreakdown = (profile: BusinessProfile, business: BusinessCandidate): BusinessFitBreakdown => {
  const salesFit = intensityFit(business.salesIntensity, profile.salesComfort);
  const technicalFit = intensityFit(business.technicalIntensity, profile.technicalComfort);
  const aiFit = business.aiLeverage <= 2 ? 90 : intensityFit(business.aiLeverage, profile.aiComfort);
  const desiredMonths = Math.max(1, profile.timeToFirstRevenueMonths);
  const monetizationSpeedFit = business.monthsToFirstRevenue <= desiredMonths
    ? 100
    : clamp(100 - ((business.monthsToFirstRevenue - desiredMonths) / desiredMonths) * 55);

  return {
    budgetFit: round(capacityFit(business.requiredBudget, profile.startingBudget)),
    timeFit: round(capacityFit(business.requiredWeeklyHours, profile.weeklyHours)),
    capabilityFit: round(salesFit * 0.35 + technicalFit * 0.35 + aiFit * 0.3),
    monetizationSpeedFit: round(monetizationSpeedFit),
    incomeGoalFit: round(capacityFit(profile.targetMonthlyIncome, business.estimatedMonthlyIncomePotential)),
    operatingStyleFit: round(calculateOperatingStyleFit(profile, business)),
    riskFit: round(calculateRiskFit(profile, business)),
    interestFit: round(calculateInterestFit(profile, business)),
  };
};

const collectBlockers = (profile: BusinessProfile, business: BusinessCandidate) => {
  const blockers: string[] = [];
  if (profile.solo && business.minimumTeamSize > 1) blockers.push(`最低${business.minimumTeamSize}人が必要`);
  if (!profile.inventoryOkay && business.inventoryRequired) blockers.push("在庫保有が必要");
  if (!profile.faceOnCameraOkay && business.faceOnCameraRequired) blockers.push("顔出しが必要");
  if (!profile.localServiceOkay && business.localServiceRequired) blockers.push("地域密着の営業・提供が必要");

  const avoidText = profile.avoid.map(normalize).filter(Boolean);
  const searchable = normalize([business.name, business.category, ...business.tags].join(" "));
  const avoided = avoidText.filter((item) => searchable.includes(item));
  if (avoided.length > 0) blockers.push(`避けたい条件に一致: ${avoided.join(", ")}`);
  return blockers;
};

const breakdownLabels: Record<keyof BusinessFitBreakdown, string> = {
  budgetFit: "初期費用が条件に合う",
  timeFit: "週の投入時間が条件に合う",
  capabilityFit: "現在のスキル・AI活用力と相性が良い",
  monetizationSpeedFit: "希望する収益化速度に合う",
  incomeGoalFit: "目標月収に届く余地がある",
  operatingStyleFit: "1人運営・在庫・顔出し等の条件に合う",
  riskFit: "リスク許容度に合う",
  interestFit: "興味分野と近い",
};

export const evaluateBusiness = (profile: BusinessProfile, business: BusinessCandidate): RankedBusiness => {
  const breakdown = calculateBreakdown(profile, business);
  const personalFitScore = round(
    breakdown.budgetFit * 0.15 +
      breakdown.timeFit * 0.15 +
      breakdown.capabilityFit * 0.2 +
      breakdown.monetizationSpeedFit * 0.1 +
      breakdown.incomeGoalFit * 0.1 +
      breakdown.operatingStyleFit * 0.1 +
      breakdown.riskFit * 0.1 +
      breakdown.interestFit * 0.1,
  );
  const marketOpportunityScore = business.marketOpportunityScore;
  const combinedScore = round(personalFitScore * 0.5 + marketOpportunityScore * 0.5);
  const blockers = collectBlockers(profile, business);
  const topReasons = (Object.entries(breakdown) as Array<[keyof BusinessFitBreakdown, number]>)
    .sort((left, right) => right[1] - left[1])
    .filter(([, score]) => score >= 70)
    .slice(0, 3)
    .map(([key]) => breakdownLabels[key]);

  return {
    business,
    personalFitScore,
    marketOpportunityScore,
    combinedScore,
    breakdown,
    blocked: blockers.length > 0,
    blockers,
    topReasons,
  };
};

export const rankBusinesses = (
  profile: BusinessProfile,
  businesses: BusinessCandidate[],
  mode: BusinessDiscoveryMode,
) => businesses
  .map((business) => evaluateBusiness(profile, business))
  .sort((left, right) => {
    if (left.blocked !== right.blocked) return left.blocked ? 1 : -1;
    const leftScore = mode === "hybrid" ? left.combinedScore : left.personalFitScore;
    const rightScore = mode === "hybrid" ? right.combinedScore : right.personalFitScore;
    if (leftScore !== rightScore) return rightScore - leftScore;
    if (left.marketOpportunityScore !== right.marketOpportunityScore) return right.marketOpportunityScore - left.marketOpportunityScore;
    return left.business.id.localeCompare(right.business.id, "ja");
  });

export const formatYen = (value: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);

