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


test("uncertain market estimates shrink toward neutral instead of dominating rankings", async () => {
  const { calculateConfidenceAdjustedMarketScore } = await import("./service");
  const research = { candidateId: "test", demand: 100, growth: 100, competitionAttractiveness: 100, profitability: 100, entryEase: 100, confidence: 0, summary: "estimate", sourceUrls: [] };
  assert.equal(calculateConfidenceAdjustedMarketScore(research), 50);
  assert.equal(calculateConfidenceAdjustedMarketScore({ ...research, confidence: 20 }), 60);
  assert.equal(calculateConfidenceAdjustedMarketScore({ ...research, confidence: 100 }), 100);
  assert.equal(calculateConfidenceAdjustedMarketScore({ ...research, demand: 0, growth: 0, competitionAttractiveness: 0, profitability: 0, entryEase: 0, confidence: 100 }), 0);
});

test("discovery rejects oversized individual interest fields", () => {
  assert.throws(() => parseDiscoveryRequest({ profile: { ...defaultBusinessProfile, interests: ["a".repeat(101)] }, mode: "personal" }), /100文字/);
});

test("discovery handles partial, missing-source, and ineligible results without live API calls", async (t) => {
  const { discoverBusinesses } = await import("./service");
  const { businessCandidates } = await import("@/lib/business-fit/data");
  const originalKey = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = "test-only-placeholder";
  t.after(() => {
    if (originalKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = originalKey;
  });

  for (const scenario of ["partial", "unverified", "blocked", "failed", "verified"] as const) {
    await t.test(scenario, async (subtest) => {
      let researchCalls = 0;
      const candidates = Array.from({ length: 100 }, (_, i) => ({ ...businessCandidates[0], id: `candidate-${i}`, name: `候補${i}`, inventoryRequired: scenario === "blocked" }));
      const mock = subtest.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
        assert.ok(init?.signal instanceof AbortSignal);
        const body = JSON.parse(String(init?.body));
        if (!body.tools) return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ candidates }) }] }] });
        researchCalls++;
        if (scenario === "failed" || (scenario === "partial" && researchCalls === 1)) throw new Error("simulated upstream outage");
        const input = JSON.parse(body.input);
        const research = input.candidates.map((candidate: { id: string }) => ({ candidateId: candidate.id, demand: 100, growth: 100, competitionAttractiveness: 100, profitability: 100, entryEase: 100, confidence: 100, summary: "現在の市場についてのテスト調査結果です。", sourceUrls: ["https://example.com/report", "https://example.com/report#section"] }));
        return Response.json({ output: [
          ...(scenario === "unverified" ? [] : [{ type: "web_search_call", action: { sources: [{ url: "https://example.com/report", title: "Report" }] } }]),
          { content: [{ type: "output_text", text: JSON.stringify({ research }) }] },
        ] });
      });
      const result = await discoverBusinesses(defaultBusinessProfile, "hybrid");
      assert.equal(result.mode, "hybrid");
      assert.equal(result.poolSize, 100);
      assert.equal(result.ranking.length, scenario === "blocked" ? 0 : 10);
      assert.equal(researchCalls, scenario === "blocked" ? 0 : 3);
      assert.equal(result.researchedCount, scenario === "verified" ? 15 : scenario === "partial" ? 10 : 0);
      assert.ok(result.ranking.every((item) => !item.blocked));
      if (scenario === "unverified" || scenario === "failed") {
        assert.ok(result.ranking.every((item) => item.confidence === 0 && item.marketOpportunityScore === 50));
        assert.ok(result.ranking.every((item) => item.researchStatus === (scenario === "failed" ? "unavailable" : "unverified")));
      }
      if (scenario === "verified" || scenario === "partial") assert.ok(result.ranking.every((item) => item.sources.length === 1));
      assert.equal(result.warnings.length > 0, scenario !== "verified");
      mock.mock.restore();
    });
  }
});
