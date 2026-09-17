import type { BusinessCandidate, BusinessDiscoveryMode, BusinessFitBreakdown } from "@/lib/business-fit/types";

export type WebResearchSource = {
  title: string;
  url: string;
};

export type BusinessScreeningResearch = {
  candidateId: string;
  demand: number;
  growth: number;
  competitionAttractiveness: number;
  confidence: number;
  summary: string;
  sourceUrls: string[];
};

export type BusinessMarketResearch = {
  candidateId: string;
  demand: number;
  growth: number;
  competitionAttractiveness: number;
  profitability: number;
  entryEase: number;
  incomeGoalFit: number;
  confidence: number;
  summary: string;
  maxRisk: string;
  validationPlan: string[];
  sourceUrls: string[];
};

export type LiveBusinessResult = {
  business: BusinessCandidate;
  breakdown: BusinessFitBreakdown;
  personalFitScore: number;
  marketOpportunityScore: number;
  finalScore: number;
  evidenceConfidence: number;
  evidenceCoverage: number;
  confidence: number;
  blocked: boolean;
  blockers: string[];
  topReasons: string[];
  researchStatus: "verified" | "screened" | "unverified" | "unavailable";
  researchSummary: string;
  maxRisk: string;
  validationPlan: string[];
  sources: WebResearchSource[];
};

export type BusinessDiscoveryResponse = {
  mode: BusinessDiscoveryMode;
  warnings: string[];
  poolSize: number;
  preselectedCount: number;
  screenedCount: number;
  shortlistedCount: number;
  researchedCount: number;
  cacheHits: number;
  generatedAt: string;
  runCostUsd: number | null;
  creditsRemainingUsd: number | null;
  ranking: LiveBusinessResult[];
};
