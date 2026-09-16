import type { BusinessDiscoveryMode, BusinessProfile, RiskTolerance } from "@/lib/business-fit/types";

const riskLevels = new Set<RiskTolerance>(["low", "medium", "high"]);
const modes = new Set<BusinessDiscoveryMode>(["personal", "hybrid"]);
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isStringArray = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string");

export const parseDiscoveryRequest = (value: unknown): { profile: BusinessProfile; mode: BusinessDiscoveryMode } => {
  if (!isObject(value) || !isObject(value.profile) || typeof value.mode !== "string" || !modes.has(value.mode as BusinessDiscoveryMode)) {
    throw new Error("入力形式が正しくありません");
  }

  const profile = value.profile;
  const requiredNumbers = [
    "startingBudget",
    "weeklyHours",
    "targetMonthlyIncome",
    "timeToFirstRevenueMonths",
    "salesComfort",
    "technicalComfort",
    "aiComfort",
  ] as const;
  for (const key of requiredNumbers) if (!isFiniteNumber(profile[key])) throw new Error(`入力項目 ${key} が正しくありません`);

  if (typeof profile.freeText !== "string" || profile.freeText.length > 4000) throw new Error("自由入力は4000文字以内にしてください");
  if (profile.startingBudget < 0 || profile.startingBudget > 100000000) throw new Error("予算の値が大きすぎます");
  if (profile.weeklyHours < 0 || profile.weeklyHours > 168) throw new Error("1週間の時間は0〜168時間で入力してください");
  if (profile.targetMonthlyIncome < 0 || profile.targetMonthlyIncome > 100000000) throw new Error("目標月収の値が大きすぎます");
  if (profile.timeToFirstRevenueMonths < 1 || profile.timeToFirstRevenueMonths > 60) throw new Error("初売上までの期間は1〜60か月で入力してください");
  for (const key of ["salesComfort", "technicalComfort", "aiComfort"] as const) {
    if (profile[key] < 1 || profile[key] > 5) throw new Error(`${key} は1〜5で入力してください`);
  }

  for (const key of ["solo", "inventoryOkay", "faceOnCameraOkay", "localServiceOkay"] as const) {
    if (typeof profile[key] !== "boolean") throw new Error(`入力項目 ${key} が正しくありません`);
  }
  if (typeof profile.riskTolerance !== "string" || !riskLevels.has(profile.riskTolerance as RiskTolerance)) throw new Error("リスク設定が正しくありません");
  if (!isStringArray(profile.interests) || !isStringArray(profile.avoid)) throw new Error("興味・避けたいことの形式が正しくありません");
  if ((profile.interests as string[]).length > 30 || (profile.avoid as string[]).length > 30) throw new Error("入力項目が多すぎます");

  return {
    mode: value.mode as BusinessDiscoveryMode,
    profile: {
      freeText: profile.freeText.trim(),
      startingBudget: profile.startingBudget,
      weeklyHours: profile.weeklyHours,
      targetMonthlyIncome: profile.targetMonthlyIncome,
      timeToFirstRevenueMonths: profile.timeToFirstRevenueMonths,
      solo: profile.solo,
      salesComfort: profile.salesComfort,
      technicalComfort: profile.technicalComfort,
      aiComfort: profile.aiComfort,
      inventoryOkay: profile.inventoryOkay,
      faceOnCameraOkay: profile.faceOnCameraOkay,
      localServiceOkay: profile.localServiceOkay,
      riskTolerance: profile.riskTolerance as RiskTolerance,
      interests: (profile.interests as string[]).map((item) => item.trim()).filter(Boolean).slice(0, 30),
      avoid: (profile.avoid as string[]).map((item) => item.trim()).filter(Boolean).slice(0, 30),
    },
  };
};
