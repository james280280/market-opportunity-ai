import type { BusinessDiscoveryMode, BusinessProfile, RiskTolerance } from "@/lib/business-fit/types";

const riskLevels = new Set<RiskTolerance>(["low", "medium", "high"]);
const modes = new Set<BusinessDiscoveryMode>(["personal", "hybrid"]);
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");

export const parseDiscoveryRequest = (value: unknown): { profile: BusinessProfile; mode: BusinessDiscoveryMode } => {
  if (!isObject(value) || !isObject(value.profile) || typeof value.mode !== "string" || !modes.has(value.mode as BusinessDiscoveryMode)) {
    throw new Error("入力形式が正しくありません");
  }

  const raw = value.profile;
  const freeText = raw.freeText;
  const startingBudget = raw.startingBudget;
  const weeklyHours = raw.weeklyHours;
  const targetMonthlyIncome = raw.targetMonthlyIncome;
  const timeToFirstRevenueMonths = raw.timeToFirstRevenueMonths;
  const salesComfort = raw.salesComfort;
  const technicalComfort = raw.technicalComfort;
  const aiComfort = raw.aiComfort;
  const solo = raw.solo;
  const inventoryOkay = raw.inventoryOkay;
  const faceOnCameraOkay = raw.faceOnCameraOkay;
  const localServiceOkay = raw.localServiceOkay;
  const riskTolerance = raw.riskTolerance;
  const interests = raw.interests;
  const avoid = raw.avoid;

  if (typeof freeText !== "string" || freeText.length > 4000) throw new Error("自由入力は4000文字以内にしてください");
  if (!isFiniteNumber(startingBudget) || startingBudget < 0 || startingBudget > 100000000) throw new Error("予算の値が正しくありません");
  if (!isFiniteNumber(weeklyHours) || weeklyHours < 0 || weeklyHours > 168) throw new Error("1週間の時間は0〜168時間で入力してください");
  if (!isFiniteNumber(targetMonthlyIncome) || targetMonthlyIncome < 0 || targetMonthlyIncome > 100000000) throw new Error("目標月収の値が正しくありません");
  if (!isFiniteNumber(timeToFirstRevenueMonths) || timeToFirstRevenueMonths < 1 || timeToFirstRevenueMonths > 60) throw new Error("初売上までの期間は1〜60か月で入力してください");
  if (!isFiniteNumber(salesComfort) || salesComfort < 1 || salesComfort > 5) throw new Error("営業の得意度は1〜5で入力してください");
  if (!isFiniteNumber(technicalComfort) || technicalComfort < 1 || technicalComfort > 5) throw new Error("PCの得意度は1〜5で入力してください");
  if (!isFiniteNumber(aiComfort) || aiComfort < 1 || aiComfort > 5) throw new Error("AIの得意度は1〜5で入力してください");
  if (typeof solo !== "boolean" || typeof inventoryOkay !== "boolean" || typeof faceOnCameraOkay !== "boolean" || typeof localServiceOkay !== "boolean") {
    throw new Error("運営条件の入力が正しくありません");
  }
  if (typeof riskTolerance !== "string" || !riskLevels.has(riskTolerance as RiskTolerance)) throw new Error("リスク設定が正しくありません");
  if (!isStringArray(interests) || !isStringArray(avoid)) throw new Error("興味・避けたいことの形式が正しくありません");
  if (interests.length > 30 || avoid.length > 30) throw new Error("入力項目が多すぎます");

  return {
    mode: value.mode as BusinessDiscoveryMode,
    profile: {
      freeText: freeText.trim(),
      startingBudget,
      weeklyHours,
      targetMonthlyIncome,
      timeToFirstRevenueMonths,
      solo,
      salesComfort,
      technicalComfort,
      aiComfort,
      inventoryOkay,
      faceOnCameraOkay,
      localServiceOkay,
      riskTolerance: riskTolerance as RiskTolerance,
      interests: interests.map((item) => item.trim()).filter(Boolean).slice(0, 30),
      avoid: avoid.map((item) => item.trim()).filter(Boolean).slice(0, 30),
    },
  };
};
