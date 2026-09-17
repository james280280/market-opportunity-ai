import assert from "node:assert/strict";
import test from "node:test";
import { defaultBusinessProfile } from "@/lib/business-fit/data";
import { calculateConfidenceAdjustedMarketScore, calculateMarketOpportunityScore, discoverBusinesses } from "./service";
import { parseDiscoveryRequest } from "./validation";

const fullResearch = {
  candidateId: "sample",
  demand: 80,
  growth: 70,
  competitionAttractiveness: 60,
  profitability: 90,
  entryEase: 50,
  incomeGoalFit: 75,
  confidence: 75,
  summary: "sample research",
  maxRisk: "競合が多い",
  validationPlan: Array.from({ length: 7 }, (_, index) => `Day ${index + 1} test`),
  sourceUrls: ["https://example.com/report"],
};

test("market opportunity score uses deterministic evidence weights", () => {
  assert.equal(calculateMarketOpportunityScore(fullResearch), 73);
});

test("uncertain market estimates shrink toward neutral", () => {
  const perfect = { ...fullResearch, demand: 100, growth: 100, competitionAttractiveness: 100, profitability: 100, entryEase: 100, confidence: 0 };
  assert.equal(calculateConfidenceAdjustedMarketScore(perfect), 50);
  assert.equal(calculateConfidenceAdjustedMarketScore({ ...perfect, confidence: 20 }), 60);
  assert.equal(calculateConfidenceAdjustedMarketScore({ ...perfect, confidence: 100 }), 100);
});

test("discovery request is unified and no longer requires a mode selector", () => {
  const parsed = parseDiscoveryRequest({ profile: defaultBusinessProfile });
  assert.equal(parsed.mode, "hybrid");
  assert.equal(parsed.profile.startingBudget, defaultBusinessProfile.startingBudget);
  assert.equal(parseDiscoveryRequest({ profile: defaultBusinessProfile, mode: "personal" }).mode, "hybrid");
});

test("discovery request rejects impossible values", () => {
  assert.throws(() => parseDiscoveryRequest({ profile: { ...defaultBusinessProfile, weeklyHours: 200 } }), /0〜168/);
  assert.throws(() => parseDiscoveryRequest({ profile: { ...defaultBusinessProfile, freeText: "a".repeat(4001) } }), /4000文字/);
  assert.throws(() => parseDiscoveryRequest({ profile: { ...defaultBusinessProfile, interests: ["a".repeat(101)] } }), /100文字/);
});

test("discovery generates 25x4 candidates, screens 20, deeply researches 10, and does not pre-rank guessed revenue", async (t) => {
  const previousKey = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = "test-only-placeholder";
  t.after(() => {
    if (previousKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = previousKey;
  });

  let generationCalls = 0;
  let screeningCalls = 0;
  let deepCalls = 0;
  const mock = t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    assert.ok(init?.signal instanceof AbortSignal);
    const body = JSON.parse(String(init?.body));
    const schemaName = String(body.text?.format?.name ?? "");

    if (!body.tools) {
      const batch = generationCalls++;
      const candidates = Array.from({ length: 25 }, (_, index) => ({
        name: `候補-${batch}-${index}`,
        summary: `テスト用の現実的な事業候補 ${batch}-${index}`,
        category: `カテゴリ${batch}`,
        requiredBudget: 10000 + index,
        requiredWeeklyHours: 5,
        monthsToFirstRevenue: 2,
        minimumTeamSize: 1,
        salesIntensity: 2,
        technicalIntensity: 2,
        aiLeverage: 4,
        inventoryRequired: false,
        faceOnCameraRequired: false,
        localServiceRequired: false,
        riskLevel: "medium",
        tags: ["AI", "テスト"],
        maxRisk: "顧客獲得に時間がかかる可能性",
      }));
      return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ candidates }) }] }] });
    }

    const input = JSON.parse(body.input);
    assert.ok(input.candidates.every((candidate: { estimatedMonthlyIncomePotential: number }) => candidate.estimatedMonthlyIncomePotential === 0));
    const cited = { type: "web_search_call", action: { sources: [{ url: "https://example.com/report", title: "Report" }] } };

    if (schemaName.startsWith("business_screening_")) {
      screeningCalls += 1;
      const research = input.candidates.map((candidate: { id: string }) => ({
        candidateId: candidate.id,
        demand: 80,
        growth: 75,
        competitionAttractiveness: 70,
        confidence: 85,
        summary: "簡易Web調査で需要と成長性を確認しました。",
        sourceUrls: ["https://example.com/report"],
      }));
      return Response.json({ output: [cited, { content: [{ type: "output_text", text: JSON.stringify({ research }) }] }] });
    }

    deepCalls += 1;
    const research = input.candidates.map((candidate: { id: string }) => ({
      candidateId: candidate.id,
      demand: 85,
      growth: 80,
      competitionAttractiveness: 72,
      profitability: 78,
      entryEase: 82,
      incomeGoalFit: 76,
      confidence: 90,
      summary: "詳細Web調査で需要、競争、収益性、始めやすさを確認しました。",
      maxRisk: "営業チャネルを確立できない可能性",
      validationPlan: Array.from({ length: 7 }, (_, index) => `検証ステップ${index + 1}`),
      sourceUrls: ["https://example.com/report"],
    }));
    return Response.json({ output: [cited, { content: [{ type: "output_text", text: JSON.stringify({ research }) }] }] });
  });

  const result = await discoverBusinesses(defaultBusinessProfile, "hybrid");
  assert.equal(generationCalls, 4);
  assert.equal(screeningCalls, 4);
  assert.equal(deepCalls, 2);
  assert.equal(result.poolSize, 100);
  assert.equal(result.preselectedCount, 30);
  assert.equal(result.screenedCount, 20);
  assert.equal(result.shortlistedCount, 10);
  assert.equal(result.researchedCount, 10);
  assert.equal(result.ranking.length, 10);
  assert.ok(result.ranking.every((item) => item.evidenceConfidence > 0 && item.evidenceCoverage > 0));
  assert.ok(result.ranking.every((item) => item.validationPlan.length === 7));
  assert.ok(result.ranking.every((item) => item.sources.length === 1));
  mock.mock.restore();
});

test("discovery continues with the usable pool when one generation lane and its refill time out", async (t) => {
  const previousKey = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = "test-only-placeholder";
  t.after(() => {
    if (previousKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = previousKey;
  });

  let generationCalls = 0;
  const mock = t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    const schemaName = String(body.text?.format?.name ?? "");

    if (!body.tools) {
      const batch = generationCalls++;
      if (batch === 0 || batch === 4) throw new DOMException("timed out", "TimeoutError");
      const candidates = Array.from({ length: 25 }, (_, index) => ({
        name: `耐障害候補-${batch}-${index}`,
        summary: `一部失敗時の継続を確認する事業候補 ${batch}-${index}`,
        category: `耐障害カテゴリ${batch}`,
        requiredBudget: 10000,
        requiredWeeklyHours: 5,
        monthsToFirstRevenue: 2,
        minimumTeamSize: 1,
        salesIntensity: 2,
        technicalIntensity: 2,
        aiLeverage: 4,
        inventoryRequired: false,
        faceOnCameraRequired: false,
        localServiceRequired: false,
        riskLevel: "medium",
        tags: ["AI", "テスト"],
        maxRisk: "顧客獲得に時間がかかる可能性",
      }));
      return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ candidates }) }] }] });
    }

    const input = JSON.parse(body.input);
    const cited = { type: "web_search_call", action: { sources: [{ url: "https://example.com/resilience", title: "Resilience" }] } };
    const common = input.candidates.map((candidate: { id: string }) => ({
      candidateId: candidate.id,
      demand: 75,
      growth: 70,
      competitionAttractiveness: 65,
      confidence: 80,
      summary: "取得済み候補を使ってWeb調査を完了しました。",
      sourceUrls: ["https://example.com/resilience"],
    }));
    const research = schemaName.startsWith("business_screening_")
      ? common
      : common.map((item: typeof common[number]) => ({
        ...item,
        profitability: 75,
        entryEase: 80,
        incomeGoalFit: 70,
        maxRisk: "集客経路を確立できない可能性",
        validationPlan: Array.from({ length: 7 }, (_, index) => `検証ステップ${index + 1}`),
      }));
    return Response.json({ output: [cited, { content: [{ type: "output_text", text: JSON.stringify({ research }) }] }] });
  });

  const result = await discoverBusinesses(defaultBusinessProfile, "hybrid");
  assert.equal(generationCalls, 5);
  assert.equal(result.poolSize, 75);
  assert.equal(result.ranking.length, 10);
  assert.ok(result.warnings.some((warning) => warning.includes("75件で続行")));
  mock.mock.restore();
});
