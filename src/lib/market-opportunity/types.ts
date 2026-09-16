export const evaluationCategories = [
  "demand",
  "growth",
  "demandSupplyGap",
  "customerPain",
  "competition",
  "profitability",
  "acquisitionDifficulty",
  "feasibility",
  "durability",
  "risk",
] as const;

export type EvaluationCategory = (typeof evaluationCategories)[number];

export type BusinessModel = "subscription" | "project" | "marketplace" | "ecommerce";
export type Region = "japan" | "global" | "asia" | "local";
export type RiskTolerance = "low" | "medium" | "high";
export type RegulatoryRisk = "low" | "medium" | "high" | "critical";

export type Evidence = {
  facts: string[];
  inferences: string[];
  assumptions: string[];
  missingInformation: string[];
  supportingEvidence: string[];
  counterEvidence: string[];
  sources: string[];
  confidence: number;
};

export type UserConstraints = {
  freeText: string;
  budget: number;
  skills: string[];
  timeframeMonths: number;
  teamSize: number;
  region: Region;
  preferredBusinessModel: BusinessModel | "any";
  targetMonthlyRevenue: number;
  riskTolerance: RiskTolerance;
  excludedMarkets: string[];
};

export type MarketCandidate = {
  id: string;
  name: string;
  summary: string;
  targetCustomer: string;
  regionFocus: Region[];
  businessModels: BusinessModel[];
  tags: string[];
  budgetRequired: number;
  teamRequired: number;
  minimumDurationMonths: number;
  requiredSkills: string[];
  regulatoryRisk: RegulatoryRisk;
  categoryScores: Record<EvaluationCategory, number>;
  categoryEvidence: Record<EvaluationCategory, Evidence>;
  topReasons: string[];
  maxRisk: string;
};

export type CategoryWeights = Record<EvaluationCategory, number>;

export type FitBreakdown = {
  budgetFit: number;
  teamFit: number;
  timeframeFit: number;
  skillFit: number;
  regionFit: number;
  businessModelFit: number;
  riskFit: number;
};

export type ScreeningResult = {
  passed: boolean;
  reasons: string[];
};

export type RankedMarket = {
  market: MarketCandidate;
  categoryWeights: CategoryWeights;
  opportunityScore: number;
  fitScore: number;
  evidenceConfidence: number;
  evidenceCoverage: number;
  rankingScore: number;
  screening: ScreeningResult;
  fitBreakdown: FitBreakdown;
};
