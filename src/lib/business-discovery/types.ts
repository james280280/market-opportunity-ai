import type { BusinessCandidate, BusinessDiscoveryMode, BusinessFitBreakdown } from "@/lib/business-fit/types";

export type WebResearchSource = {
  title: string;
  url: string;
};

export type BusinessMarketResearch = {
  candidateId: string;
  demand: number;
  growth: number;
  competitionAttractiveness: number;
  profitability: number;
  entryEase: number;
  confidence: number;
  summary: string;
  sourceUrls: string[];
};

export type LiveBusinessResult = {
  business: BusinessCandidate;
  breakdown: BusinessFitBreakdown;
  personalFitScore: number;
  marketOpportunityScore: number;
  finalScore: number;
  confidence: number;
  blocked: boolean;
  blockers: string[];
  topReasons: string[];
  researchStatus: "verified" | "unverified" | "unavailable";
  researchSummary: string;
  sources: WebResearchSource[];
};

export type BusinessDiscoveryResponse = {
  mode: BusinessDiscoveryMode;
  warnings: string[];
  poolSize: number;
  shortlistedCount: number;
  researchedCount: number;
  generatedAt: string;
  ranking: LiveBusinessResult[];
};

