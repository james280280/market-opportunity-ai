import assert from "node:assert/strict";
import test from "node:test";
import { defaultBusinessProfile } from "@/lib/business-fit/data";
import { calculateMarketOpportunityScore } from "./service";
import { parseDiscoveryRequest } from "./validation";

test("market opportunity score uses deterministic web research weights", () => {
  const score = calculateMarketOpportunityScore({
    candidateId: "sample",
    demand: 80,
    growth: 70,
    competitionAttractiveness: 60,
    profitability: 90,
    entryEase: 50,
    confidence: 75,
    summary: "sample",
    sourceUrls: ["https://example.com"],
  });
  assert.equal(score, 73);
});

test("discovery request accepts the normal beginner profile", () => {
  const parsed = parseDiscoveryRequest({ profile: defaultBusinessProfile, mode: "personal" });
  assert.equal(parsed.mode, "personal");
  assert.equal(parsed.profile.startingBudget, defaultBusinessProfile.startingBudget);
});

test("discovery request rejects impossible weekly hours", () => {
  assert.throws(
    () => parseDiscoveryRequest({ profile: { ...defaultBusinessProfile, weeklyHours: 200 }, mode: "personal" }),
    /0〜168/,
  );
});

test("discovery request rejects oversized free text", () => {
  assert.throws(
    () => parseDiscoveryRequest({ profile: { ...defaultBusinessProfile, freeText: "a".repeat(4001) }, mode: "hybrid" }),
    /4000文字/,
  );
});
