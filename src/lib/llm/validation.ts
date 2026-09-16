import type { UserConstraints } from "@/lib/market-opportunity/types";
import type { GeneratedMarketHypothesis, ParsedConstraintSuggestion } from "./types";

const regions = new Set(["japan", "global", "asia", "local"]);
const businessModels = new Set(["subscription", "project", "marketplace", "ecommerce", "any"]);
const riskTolerances = new Set(["low", "medium", "high"]);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNullableFiniteNumber = (value: unknown) =>
  value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);

const isNullableStringArray = (value: unknown) =>
  value === null || (Array.isArray(value) && value.every((item) => typeof item === "string"));

const requireStringArray = (value: unknown, field: string): string[] => {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`LLM response field ${field} must be a string array`);
  }
  return value;
};

export const parseConstraintSuggestion = (value: unknown): ParsedConstraintSuggestion => {
  if (!isObject(value)) throw new Error("LLM response must be an object");

  const requiredKeys = [
    "budget",
    "timeframeMonths",
    "teamSize",
    "weeklyHours",
    "skills",
    "unavailableSkills",
    "region",
    "preferredBusinessModel",
    "targetMonthlyRevenue",
    "riskTolerance",
    "excludedMarkets",
    "notes",
  ];
  for (const key of requiredKeys) {
    if (!(key in value)) throw new Error(`LLM response is missing ${key}`);
  }

  if (!isNullableFiniteNumber(value.budget)) throw new Error("Invalid budget");
  if (!isNullableFiniteNumber(value.timeframeMonths)) throw new Error("Invalid timeframeMonths");
  if (!isNullableFiniteNumber(value.teamSize)) throw new Error("Invalid teamSize");
  if (!isNullableFiniteNumber(value.weeklyHours)) throw new Error("Invalid weeklyHours");
  if (!isNullableFiniteNumber(value.targetMonthlyRevenue)) throw new Error("Invalid targetMonthlyRevenue");
  if (!isNullableStringArray(value.skills)) throw new Error("Invalid skills");
  if (!isNullableStringArray(value.unavailableSkills)) throw new Error("Invalid unavailableSkills");
  if (!isNullableStringArray(value.excludedMarkets)) throw new Error("Invalid excludedMarkets");
  if (value.region !== null && (typeof value.region !== "string" || !regions.has(value.region))) throw new Error("Invalid region");
  if (
    value.preferredBusinessModel !== null &&
    (typeof value.preferredBusinessModel !== "string" || !businessModels.has(value.preferredBusinessModel))
  ) throw new Error("Invalid preferredBusinessModel");
  if (value.riskTolerance !== null && (typeof value.riskTolerance !== "string" || !riskTolerances.has(value.riskTolerance))) {
    throw new Error("Invalid riskTolerance");
  }

  return {
    budget: value.budget as number | null,
    timeframeMonths: value.timeframeMonths as number | null,
    teamSize: value.teamSize as number | null,
    weeklyHours: value.weeklyHours as number | null,
    skills: value.skills as string[] | null,
    unavailableSkills: value.unavailableSkills as string[] | null,
    region: value.region as ParsedConstraintSuggestion["region"],
    preferredBusinessModel: value.preferredBusinessModel as ParsedConstraintSuggestion["preferredBusinessModel"],
    targetMonthlyRevenue: value.targetMonthlyRevenue as number | null,
    riskTolerance: value.riskTolerance as ParsedConstraintSuggestion["riskTolerance"],
    excludedMarkets: value.excludedMarkets as string[] | null,
    notes: requireStringArray(value.notes, "notes"),
  };
};

export const applyConstraintSuggestion = (
  current: UserConstraints,
  suggestion: ParsedConstraintSuggestion,
): UserConstraints => ({
  ...current,
  budget: suggestion.budget ?? current.budget,
  timeframeMonths: suggestion.timeframeMonths ?? current.timeframeMonths,
  teamSize: suggestion.teamSize ?? current.teamSize,
  weeklyHours: suggestion.weeklyHours ?? current.weeklyHours,
  skills: suggestion.skills ?? current.skills,
  unavailableSkills: suggestion.unavailableSkills ?? current.unavailableSkills,
  region: suggestion.region ?? current.region,
  preferredBusinessModel: suggestion.preferredBusinessModel ?? current.preferredBusinessModel,
  targetMonthlyRevenue: suggestion.targetMonthlyRevenue ?? current.targetMonthlyRevenue,
  riskTolerance: suggestion.riskTolerance ?? current.riskTolerance,
  excludedMarkets: suggestion.excludedMarkets ?? current.excludedMarkets,
});

export const parseMarketHypotheses = (value: unknown): GeneratedMarketHypothesis[] => {
  if (!Array.isArray(value) || value.length < 5 || value.length > 10) {
    throw new Error("LLM hypotheses response must contain 5 to 10 items");
  }

  const seenIds = new Set<string>();
  return value.map((item, index) => {
    if (!isObject(item)) throw new Error(`Hypothesis ${index + 1} must be an object`);
    const stringFields = ["id", "name", "summary", "targetCustomer", "whyItMightFit"] as const;
    for (const key of stringFields) {
      if (typeof item[key] !== "string" || !(item[key] as string).trim()) {
        throw new Error(`Hypothesis ${index + 1} has invalid ${key}`);
      }
    }
    const id = (item.id as string).trim();
    if (seenIds.has(id)) throw new Error(`Duplicate hypothesis id: ${id}`);
    seenIds.add(id);

    return {
      id,
      name: (item.name as string).trim(),
      summary: (item.summary as string).trim(),
      targetCustomer: (item.targetCustomer as string).trim(),
      whyItMightFit: (item.whyItMightFit as string).trim(),
      assumptions: requireStringArray(item.assumptions, "assumptions"),
      unknowns: requireStringArray(item.unknowns, "unknowns"),
      suggestedValidation: requireStringArray(item.suggestedValidation, "suggestedValidation"),
    };
  });
};
