import assert from "node:assert/strict";
import test from "node:test";
import { defaultUserConstraints, marketCandidates } from "./market-opportunity/data.ts";
import {
  calculateEvidenceMetrics,
  evaluateMarket,
  getCategoryWeights,
  getUniqueEvidenceSignals,
  rankMarkets,
  screenMarket,
} from "./market-opportunity/engine.ts";
import { normalizeCsvEntries, normalizeLooseText, normalizeSkill, normalizeSkillList } from "./market-opportunity/normalize.ts";
import { evaluationCategories, type Evidence, type MarketCandidate, type UserConstraints } from "./market-opportunity/types.ts";

test("weights are normalized and emphasize feasibility for constrained users", () => {
  const weights = getCategoryWeights({
    ...defaultUserConstraints,
    budget: 4000000,
    teamSize: 2,
    timeframeMonths: 4,
    riskTolerance: "low",
  });

  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  assert.ok(total >= 0.98 && total <= 1.02);
  assert.ok(weights.feasibility > weights.growth);
  assert.ok(weights.risk > weights.customerPain);
});

test("budget, time, team and learnable skills are warnings while hard blockers stay explicit", () => {
  const strictConstraints: UserConstraints = {
    ...defaultUserConstraints,
    budget: 10000,
    teamSize: 1,
    weeklyHours: 5,
    timeframeMonths: 1,
    skills: [],
    unavailableSkills: ["medical"],
    excludedMarkets: ["医療診断"],
  };

  const medicalMarket = marketCandidates.find((candidate) => candidate.id === "online-medical-diagnosis");
  assert.ok(medicalMarket);

  const screening = screenMarket(strictConstraints, medicalMarket);
  assert.equal(screening.passed, false);
  assert.ok(screening.warnings.some((warning) => warning.includes("予算")));
  assert.ok(screening.warnings.some((warning) => warning.includes("人数")));
  assert.ok(screening.warnings.some((warning) => warning.includes("時間")));
  assert.ok(screening.warnings.some((warning) => warning.includes("期間")));
  assert.ok(screening.warnings.some((warning) => warning.includes("今から覚えると有利")));
  assert.ok(screening.reasons.some((reason) => reason.includes("やりたくない・できない")));
  assert.ok(screening.reasons.some((reason) => reason.includes("候補から外したい分野")));
  assert.ok(screening.reasons.some((reason) => reason.includes("法律・安全面")));
});

test("a budget mismatch alone does not disqualify a beginner", () => {
  const target = marketCandidates.find((candidate) => candidate.id === "manufacturing-maintenance-ai");
  assert.ok(target);
  const screening = screenMarket({
    ...defaultUserConstraints,
    budget: 10000,
    skills: ["ai", "sales"],
    excludedMarkets: [],
  }, target);
  assert.equal(screening.passed, true);
  assert.ok(screening.warnings.some((warning) => warning.includes("予算")));
});

test("ranking is deterministic for the same input and keeps hard-blocked markets last", () => {
  const firstRun = rankMarkets(defaultUserConstraints, marketCandidates).map((item) => item.market.id);
  const secondRun = rankMarkets(defaultUserConstraints, marketCandidates).map((item) => item.market.id);
  assert.deepEqual(firstRun, secondRun);

  const evaluated = rankMarkets(defaultUserConstraints, marketCandidates);
  const firstFailedIndex = evaluated.findIndex((item) => !item.screening.passed);
  assert.notEqual(firstFailedIndex, -1);
  assert.ok(evaluated.slice(0, firstFailedIndex).every((item) => item.screening.passed));
});

test("evaluation separates opportunity, fit, and evidence metrics", () => {
  const targetMarket = marketCandidates.find((candidate) => candidate.id === "manufacturing-maintenance-ai");
  assert.ok(targetMarket);

  const evaluation = evaluateMarket(defaultUserConstraints, targetMarket);
  const evidence = calculateEvidenceMetrics(targetMarket);
  assert.equal(evaluation.opportunityScore > 0, true);
  assert.equal(evaluation.fitScore > 0, true);
  assert.equal(evaluation.evidenceConfidence, evidence.evidenceConfidence);
  assert.equal(evaluation.evidenceCoverage, 90);
  assert.equal(
    evaluation.rankingScore,
    Math.round((evaluation.opportunityScore * 0.6 + evaluation.fitScore * 0.4) * 10) / 10,
  );
});

test("evidence coverage falls when a category has no facts or support", () => {
  const incompleteMarket: MarketCandidate = {
    ...marketCandidates[0],
    id: "incomplete-evidence",
    categoryEvidence: {
      ...marketCandidates[0].categoryEvidence,
      competition: {
        ...marketCandidates[0].categoryEvidence.competition,
        facts: [],
        supportingEvidence: [],
      },
    },
  };
  const metrics = calculateEvidenceMetrics(incompleteMarket);
  assert.equal(metrics.evidenceCoverage, 90);
});

test("csv normalization preserves skill and exclusion matching", () => {
  const targetMarket = marketCandidates.find((candidate) => candidate.id === "field-sales-training-saas");
  assert.ok(targetMarket);

  const normalizedConstraints: UserConstraints = {
    ...defaultUserConstraints,
    skills: normalizeCsvEntries("営業, AI, 商品企画"),
    excludedMarkets: normalizeCsvEntries("医療 診断, 規制"),
  };

  const evaluation = evaluateMarket(normalizedConstraints, targetMarket);
  assert.equal(normalizedConstraints.skills.length, 3);
  assert.equal(normalizeLooseText(normalizedConstraints.excludedMarkets[0]), "医療診断");
  assert.deepEqual(normalizeSkillList(normalizedConstraints.skills), ["sales", "ai", "product"]);
  assert.equal(normalizeSkill("商品企画"), "product");
  assert.equal(evaluation.fitBreakdown.skillFit, 100);

  const medicalMarket = marketCandidates.find((candidate) => candidate.id === "online-medical-diagnosis");
  assert.ok(medicalMarket);
  const screening = screenMarket(normalizedConstraints, medicalMarket);
  assert.ok(screening.reasons.some((reason) => reason.includes("候補から外したい分野")));
});

test("skill aliases and unavailable skills affect fit and screening", () => {
  const targetMarket = marketCandidates.find((candidate) => candidate.id === "manufacturing-maintenance-ai");
  assert.ok(targetMarket);

  const constraints: UserConstraints = {
    ...defaultUserConstraints,
    skills: normalizeCsvEntries("営業, AI, プロダクト"),
    unavailableSkills: normalizeCsvEntries("AI"),
    excludedMarkets: [],
  };

  const evaluation = evaluateMarket(constraints, targetMarket);
  const screening = screenMarket(constraints, targetMarket);
  assert.equal(normalizeSkill("営業"), "sales");
  assert.equal(normalizeSkill("AI"), "ai");
  assert.equal(evaluation.fitBreakdown.skillFit, 50);
  assert.ok(screening.reasons.some((reason) => reason.includes("AIを使う力")));
});

test("excluded market matching also checks summary text", () => {
  const summaryMatchedMarket: MarketCandidate = {
    ...marketCandidates[0],
    id: "summary-exclusion-check",
    name: "非一致な市場名",
    tags: ["B2B"],
    summary: "この市場は物流自動化の検証を支援する。",
  };

  const screening = screenMarket(
    { ...defaultUserConstraints, excludedMarkets: ["物流自動化"] },
    summaryMatchedMarket,
  );
  assert.ok(screening.reasons.some((reason) => reason.includes("候補から外したい分野")));
});

test("duplicate signal groups are counted once", () => {
  const sharedEvidence: Evidence = {
    ...marketCandidates[0].categoryEvidence.demand,
    id: "shared-signal",
    signalGroup: "shared-demand-signal",
    confidence: 55,
  };
  const uniqueEvidence: Evidence = {
    ...marketCandidates[0].categoryEvidence.growth,
    id: "unique-signal",
    signalGroup: "unique-growth-signal",
    confidence: 95,
  };

  const duplicatedSignalsMarket: MarketCandidate = {
    ...marketCandidates[0],
    id: "duplicate-signal-groups",
    categoryEvidence: {
      ...marketCandidates[0].categoryEvidence,
      demand: sharedEvidence,
      growth: { ...sharedEvidence, id: "shared-signal-copy" },
      demandSupplyGap: uniqueEvidence,
    },
  };

  const uniqueSignals = getUniqueEvidenceSignals(Object.values(duplicatedSignalsMarket.categoryEvidence));
  const metrics = calculateEvidenceMetrics(duplicatedSignalsMarket);
  assert.equal(uniqueSignals.length, evaluationCategories.length - 1);
  assert.equal(metrics.evidenceConfidence, 77.3);
  assert.equal(metrics.evidenceCoverage, 80);
});
