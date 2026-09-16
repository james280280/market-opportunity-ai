import assert from "node:assert/strict";
import test from "node:test";
import { businessCandidates, defaultBusinessProfile } from "./data";
import { evaluateBusiness, rankBusinesses } from "./engine";

test("same profile and candidates produce the same order", () => {
  const first = rankBusinesses(defaultBusinessProfile, businessCandidates, "personal").map((item) => item.business.id);
  const second = rankBusinesses(defaultBusinessProfile, businessCandidates, "personal").map((item) => item.business.id);
  assert.deepEqual(first, second);
});

test("avoid conditions are explicit blockers and sort after eligible candidates", () => {
  const profile = { ...defaultBusinessProfile, avoid: ["営業代行"] };
  const ranking = rankBusinesses(profile, businessCandidates, "personal");
  const salesAgency = ranking.find((item) => item.business.id === "sales-agency");
  assert.ok(salesAgency);
  assert.equal(salesAgency.blocked, true);
  assert.match(salesAgency.blockers.join(" "), /避けたい条件/);
  const firstBlockedIndex = ranking.findIndex((item) => item.blocked);
  const lastEligibleIndex = ranking.map((item) => item.blocked).lastIndexOf(false);
  assert.ok(firstBlockedIndex > lastEligibleIndex);
});

test("income target changes income-goal fit without changing market opportunity score", () => {
  const business = businessCandidates.find((item) => item.id === "digital-products");
  assert.ok(business);
  const modest = evaluateBusiness({ ...defaultBusinessProfile, targetMonthlyIncome: 200000 }, business);
  const ambitious = evaluateBusiness({ ...defaultBusinessProfile, targetMonthlyIncome: 1000000 }, business);
  assert.ok(modest.breakdown.incomeGoalFit > ambitious.breakdown.incomeGoalFit);
  assert.equal(modest.marketOpportunityScore, ambitious.marketOpportunityScore);
});

test("hybrid combined score keeps market and personal scores separate", () => {
  const result = rankBusinesses(defaultBusinessProfile, businessCandidates, "hybrid")[0];
  assert.equal(
    result.combinedScore,
    Math.round(((result.personalFitScore + result.marketOpportunityScore) / 2) * 10) / 10,
  );
  assert.notEqual(result.personalFitScore, undefined);
  assert.notEqual(result.marketOpportunityScore, undefined);
});

test("insufficient budget reduces budget fit", () => {
  const business = businessCandidates.find((item) => item.id === "niche-ecommerce");
  assert.ok(business);
  const lowBudget = evaluateBusiness({ ...defaultBusinessProfile, startingBudget: 10000 }, business);
  const enoughBudget = evaluateBusiness({ ...defaultBusinessProfile, startingBudget: 200000 }, business);
  assert.ok(lowBudget.breakdown.budgetFit < enoughBudget.breakdown.budgetFit);
});
