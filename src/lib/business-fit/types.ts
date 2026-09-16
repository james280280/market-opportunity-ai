export type BusinessDiscoveryMode = "personal" | "hybrid";
export type RiskTolerance = "low" | "medium" | "high";

export type BusinessProfile = {
  freeText: string;
  startingBudget: number;
  weeklyHours: number;
  targetMonthlyIncome: number;
  timeToFirstRevenueMonths: number;
  solo: boolean;
  salesComfort: number;
  technicalComfort: number;
  aiComfort: number;
  inventoryOkay: boolean;
  faceOnCameraOkay: boolean;
  localServiceOkay: boolean;
  riskTolerance: RiskTolerance;
  interests: string[];
  avoid: string[];
};

export type BusinessCandidate = {
  id: string;
  name: string;
  summary: string;
  category: string;
  marketOpportunityScore: number;
  requiredBudget: number;
  requiredWeeklyHours: number;
  monthsToFirstRevenue: number;
  minimumTeamSize: number;
  salesIntensity: number;
  technicalIntensity: number;
  aiLeverage: number;
  inventoryRequired: boolean;
  faceOnCameraRequired: boolean;
  localServiceRequired: boolean;
  riskLevel: RiskTolerance;
  tags: string[];
  maxRisk: string;
  first7Days: string[];
};

export type BusinessFitBreakdown = {
  budgetFit: number;
  timeFit: number;
  capabilityFit: number;
  monetizationSpeedFit: number;
  operatingStyleFit: number;
  riskFit: number;
  interestFit: number;
};

export type RankedBusiness = {
  business: BusinessCandidate;
  personalFitScore: number;
  marketOpportunityScore: number;
  combinedScore: number;
  breakdown: BusinessFitBreakdown;
  blocked: boolean;
  blockers: string[];
  topReasons: string[];
};
