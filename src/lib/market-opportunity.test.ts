import assert from "node:assert/strict";
import test from "node:test";
import { defaultUserConstraints, marketCandidates } from "./market-opportunity/data.ts";
import {
  calculateEvidenceMetrics,
  evaluateMarket,
  getCategoryWeights,
  rankMarkets,
  screenMarket,
} from "./market-opportunity/engine.ts";
import { normalizeCsvEntries } from "./market-opportunity/normalize.ts";
import type { MarketCandidate, UserConstraints } from "./market-opportunity/types.ts";

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

test("screening keeps disqualified reasons instead of dropping the market", () => {
  const strictConstraints: UserConstraints = {
    ...defaultUserConstraints,
    budget: 5000000,
    teamSize: 2,
    timeframeMonths: 3,
    skills: ["sales"],
    excludedMarkets: ["医療診断"],
  };

  const medicalMarket = marketCandidates.find((candidate) => candidate.id === "online-medical-diagnosis");
  assert.ok(medicalMarket);

  const screening = screenMarket(strictConstraints, medicalMarket);
  assert.equal(screening.passed, false);
  assert.ok(screening.reasons.some((reason) => reason.includes("予算超過")));
  assert.ok(screening.reasons.some((reason) => reason.includes("人数超過")));
  assert.ok(screening.reasons.some((reason) => reason.includes("期間超過")));
  assert.ok(screening.reasons.some((reason) => reason.includes("必須スキル不足")));
  assert.ok(screening.reasons.some((reason) => reason.includes("除外市場")));
  assert.ok(screening.reasons.some((reason) => reason.includes("重大法規制リスク")));
});

test("ranking is deterministic for the same input and keeps passed markets first", () => {
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
  assert.equal(evaluation.evidenceCoverage, 100);
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
    skills: normalizeCsvEntries("sales, ai, product"),
    excludedMarkets: normalizeCsvEntries("医療診断, 規制"),
  };

  const evaluation = evaluateMarket(normalizedConstraints, targetMarket);
  assert.equal(normalizedConstraints.skills.length, 3);
  assert.equal(evaluation.fitBreakdown.skillFit, 100);

  const medicalMarket = marketCandidates.find((candidate) => candidate.id === "online-medical-diagnosis");
  assert.ok(medicalMarket);
  const screening = screenMarket(normalizedConstraints, medicalMarket);
  assert.ok(screening.reasons.some((reason) => reason.includes("除外市場")));
});
