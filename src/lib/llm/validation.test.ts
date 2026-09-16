import assert from "node:assert/strict";
import test from "node:test";
import { defaultUserConstraints, marketCandidates } from "@/lib/market-opportunity/data";
import { rankMarkets } from "@/lib/market-opportunity/engine";
import { OpenAILLMClient } from "./openai-client";
import { applyConstraintSuggestion, parseConstraintSuggestion, parseMarketHypotheses } from "./validation";

test("null LLM fields do not overwrite existing user constraints", () => {
  const suggestion = parseConstraintSuggestion({
    budget: null,
    timeframeMonths: 3,
    teamSize: null,
    weeklyHours: 12,
    skills: null,
    unavailableSkills: ["hardware"],
    region: null,
    preferredBusinessModel: "subscription",
    targetMonthlyRevenue: null,
    riskTolerance: null,
    excludedMarkets: null,
    notes: ["予算は明示されていない"],
  });

  const next = applyConstraintSuggestion(defaultUserConstraints, suggestion);
  assert.equal(next.budget, defaultUserConstraints.budget);
  assert.equal(next.teamSize, defaultUserConstraints.teamSize);
  assert.deepEqual(next.skills, defaultUserConstraints.skills);
  assert.equal(next.timeframeMonths, 3);
  assert.equal(next.weeklyHours, 12);
  assert.deepEqual(next.unavailableSkills, ["hardware"]);
});

test("malformed structured constraint output is rejected", () => {
  assert.throws(() =>
    parseConstraintSuggestion({
      budget: "cheap",
      timeframeMonths: null,
    }),
  );
});

test("market hypotheses are validated without scores", () => {
  const hypotheses = parseMarketHypotheses([
    {
      id: "small-b2b-tool",
      name: "小規模B2B業務支援",
      summary: "反復業務を軽量に支援する仮説",
      targetCustomer: "中小企業",
      whyItMightFit: "少人数で検証しやすい",
      assumptions: ["反復業務が残っている"],
      unknowns: ["支払い意欲"],
      suggestedValidation: ["5社ヒアリング"],
    },
  ]);

  assert.equal(hypotheses.length, 1);
  assert.equal("opportunityScore" in hypotheses[0], false);
  assert.equal("categoryScores" in hypotheses[0], false);
});

test("AI hypothesis validation does not alter deterministic ranking inputs", () => {
  const before = rankMarkets(defaultUserConstraints, marketCandidates).map((item) => item.market.id);
  parseMarketHypotheses([
    {
      id: "unranked-hypothesis",
      name: "未評価仮説",
      summary: "ランキングには混ぜない",
      targetCustomer: "仮説顧客",
      whyItMightFit: "条件仮説",
      assumptions: [],
      unknowns: ["実データ未取得"],
      suggestedValidation: ["一次調査"],
    },
  ]);
  const after = rankMarkets(defaultUserConstraints, marketCandidates).map((item) => item.market.id);
  assert.deepEqual(after, before);
});

test("OpenAI client fails clearly when API configuration is missing", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;

  try {
    const client = new OpenAILLMClient();
    await assert.rejects(
      () => client.parseUserConstraints({ input: "低予算で始めたい", currentConstraints: defaultUserConstraints }),
      /OPENAI_API_KEY is not configured/,
    );
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previousModel;
  }
});
