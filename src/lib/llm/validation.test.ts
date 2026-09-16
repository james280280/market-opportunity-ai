import assert from "node:assert/strict";
import test from "node:test";
import { defaultUserConstraints, marketCandidates } from "@/lib/market-opportunity/data";
import { rankMarkets } from "@/lib/market-opportunity/engine";
import { OpenAILLMClient, resolveLLMRuntimeConfig, runWithVercelOidcToken } from "./openai-client";
import { applyConstraintSuggestion, parseConstraintSuggestion, parseMarketHypotheses } from "./validation";

const makeHypothesis = (index: number) => ({
  id: `hypothesis-${index}`,
  name: `市場仮説 ${index}`,
  summary: "反復業務を軽量に支援する未評価の仮説",
  targetCustomer: "中小企業",
  whyItMightFit: "少人数で検証しやすい",
  assumptions: ["反復業務が残っている"],
  unknowns: ["支払い意欲"],
  suggestedValidation: ["5社ヒアリング"],
});

const fiveHypotheses = () => Array.from({ length: 5 }, (_, index) => makeHypothesis(index + 1));

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
  const hypotheses = parseMarketHypotheses(fiveHypotheses());

  assert.equal(hypotheses.length, 5);
  assert.equal("opportunityScore" in hypotheses[0], false);
  assert.equal("categoryScores" in hypotheses[0], false);
});

test("fewer than five market hypotheses are rejected", () => {
  assert.throws(() => parseMarketHypotheses([makeHypothesis(1)]), /5 to 10 items/);
});

test("AI hypothesis validation does not alter deterministic ranking inputs", () => {
  const before = rankMarkets(defaultUserConstraints, marketCandidates).map((item) => item.market.id);
  parseMarketHypotheses(fiveHypotheses());
  const after = rankMarkets(defaultUserConstraints, marketCandidates).map((item) => item.market.id);
  assert.deepEqual(after, before);
});

test("Vercel OIDC selects AI Gateway with a provider-prefixed default model", () => {
  const config = resolveLLMRuntimeConfig({ VERCEL_OIDC_TOKEN: "test-oidc-token" });
  assert.equal(config.provider, "vercel-ai-gateway");
  assert.equal(config.url, "https://ai-gateway.vercel.sh/v1/responses");
  assert.equal(config.model, "openai/gpt-5.6-luna");
});

test("request-scoped Vercel OIDC survives async work and selects AI Gateway", async () => {
  const config = await runWithVercelOidcToken("request-oidc-token", async () => {
    await Promise.resolve();
    return resolveLLMRuntimeConfig({});
  });
  assert.equal(config.provider, "vercel-ai-gateway");
  assert.equal(config.apiKey, "request-oidc-token");
  assert.equal(config.model, "openai/gpt-5.6-luna");
});

test("AI Gateway API key takes the same gateway path", () => {
  const config = resolveLLMRuntimeConfig({ AI_GATEWAY_API_KEY: "test-gateway-key", OPENAI_MODEL: "gpt-5.6-luna" });
  assert.equal(config.provider, "vercel-ai-gateway");
  assert.equal(config.model, "openai/gpt-5.6-luna");
});

test("direct OpenAI remains available as a fallback", () => {
  const config = resolveLLMRuntimeConfig({ OPENAI_API_KEY: "test-openai-key", OPENAI_MODEL: "openai/gpt-5.6-luna" });
  assert.equal(config.provider, "openai-direct");
  assert.equal(config.url, "https://api.openai.com/v1/responses");
  assert.equal(config.model, "gpt-5.6-luna");
});

test("LLM client fails clearly when no supported authentication is available", async () => {
  const previousOpenAIKey = process.env.OPENAI_API_KEY;
  const previousGatewayKey = process.env.AI_GATEWAY_API_KEY;
  const previousOidcToken = process.env.VERCEL_OIDC_TOKEN;
  const previousModel = process.env.OPENAI_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.VERCEL_OIDC_TOKEN;
  delete process.env.OPENAI_MODEL;

  try {
    const client = new OpenAILLMClient();
    await assert.rejects(
      () => client.parseUserConstraints({ input: "低予算で始めたい", currentConstraints: defaultUserConstraints }),
      /AI authentication is not configured/,
    );
  } finally {
    if (previousOpenAIKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousOpenAIKey;
    if (previousGatewayKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = previousGatewayKey;
    if (previousOidcToken === undefined) delete process.env.VERCEL_OIDC_TOKEN;
    else process.env.VERCEL_OIDC_TOKEN = previousOidcToken;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previousModel;
  }
});



test("provider billing and credential failures have actionable messages without upstream details", async () => {
  const { getAIServiceError } = await import("./service-error");
  const billing = getAIServiceError(new Error("AI Gateway requires a valid credit card on file to service requests. Please visit https://vercel.com/private"));
  assert.equal(billing?.status, 503);
  assert.match(billing?.error ?? "", /請求設定/);
  assert.doesNotMatch(billing?.error ?? "", /https:|AI Gateway/);
  const auth = getAIServiceError(new Error("OPENAI_API_KEY is missing"));
  assert.equal(auth?.status, 503);
  assert.doesNotMatch(auth?.error ?? "", /API_KEY/);
  assert.equal(getAIServiceError(new DOMException("timeout", "TimeoutError"))?.status, 504);
  assert.equal(getAIServiceError(new Error("入力形式が正しくありません")), null);
});
