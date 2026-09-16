import type { BusinessModel, Region, RiskTolerance, UserConstraints } from "@/lib/market-opportunity/types";

export type ParsedConstraintSuggestion = {
  budget: number | null;
  timeframeMonths: number | null;
  teamSize: number | null;
  weeklyHours: number | null;
  skills: string[] | null;
  unavailableSkills: string[] | null;
  region: Region | null;
  preferredBusinessModel: BusinessModel | "any" | null;
  targetMonthlyRevenue: number | null;
  riskTolerance: RiskTolerance | null;
  excludedMarkets: string[] | null;
  notes: string[];
};

export type GeneratedMarketHypothesis = {
  id: string;
  name: string;
  summary: string;
  targetCustomer: string;
  whyItMightFit: string;
  assumptions: string[];
  unknowns: string[];
  suggestedValidation: string[];
};

export type ParseConstraintsRequest = {
  input: string;
  currentConstraints: UserConstraints;
};

export type GenerateHypothesesRequest = {
  constraints: UserConstraints;
};

export interface LLMClient {
  parseUserConstraints(request: ParseConstraintsRequest): Promise<ParsedConstraintSuggestion>;
  generateMarketHypotheses(request: GenerateHypothesesRequest): Promise<GeneratedMarketHypothesis[]>;
}
