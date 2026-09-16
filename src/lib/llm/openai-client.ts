import type { LLMClient, GenerateHypothesesRequest, ParseConstraintsRequest } from "./types";
import { parseConstraintSuggestion, parseMarketHypotheses } from "./validation";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const VERCEL_AI_GATEWAY_RESPONSES_URL = "https://ai-gateway.vercel.sh/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";

type LLMRuntimeConfig = {
  url: string;
  apiKey: string;
  model: string;
  provider: "vercel-ai-gateway" | "openai-direct";
};

type RuntimeEnv = Record<string, string | undefined>;

const toGatewayModel = (model: string) => (model.includes("/") ? model : `openai/${model}`);
const toDirectOpenAIModel = (model: string) => (model.startsWith("openai/") ? model.slice("openai/".length) : model);

export const resolveLLMRuntimeConfig = (env: RuntimeEnv = process.env): LLMRuntimeConfig => {
  const configuredModel = env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const gatewayToken = env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN;

  if (gatewayToken) {
    return {
      url: VERCEL_AI_GATEWAY_RESPONSES_URL,
      apiKey: gatewayToken,
      model: toGatewayModel(configuredModel),
      provider: "vercel-ai-gateway",
    };
  }

  if (env.OPENAI_API_KEY) {
    return {
      url: OPENAI_RESPONSES_URL,
      apiKey: env.OPENAI_API_KEY,
      model: toDirectOpenAIModel(configuredModel),
      provider: "openai-direct",
    };
  }

  throw new Error(
    "AI authentication is not configured. Vercel production can use VERCEL_OIDC_TOKEN automatically; local development needs AI_GATEWAY_API_KEY or OPENAI_API_KEY.",
  );
};

const constraintSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "budget",
    "timeframeMonths",
    "teamSize",
    "weeklyHours",
    "skills",
    "unavailableSkills",
    "region",
    "preferredBusinessModel",
    "targetMonthlyRevenue",
    "riskTolerance",
    "excludedMarkets",
    "notes",
  ],
  properties: {
    budget: { type: ["number", "null"], minimum: 0 },
    timeframeMonths: { type: ["number", "null"], minimum: 0 },
    teamSize: { type: ["number", "null"], minimum: 0 },
    weeklyHours: { type: ["number", "null"], minimum: 0 },
    skills: { anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }] },
    unavailableSkills: { anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }] },
    region: { enum: ["japan", "global", "asia", "local", null] },
    preferredBusinessModel: { enum: ["subscription", "project", "marketplace", "ecommerce", "any", null] },
    targetMonthlyRevenue: { type: ["number", "null"], minimum: 0 },
    riskTolerance: { enum: ["low", "medium", "high", null] },
    excludedMarkets: { anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }] },
    notes: { type: "array", items: { type: "string" } },
  },
} as const;

const hypothesesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["hypotheses"],
  properties: {
    hypotheses: {
      type: "array",
      minItems: 5,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "summary", "targetCustomer", "whyItMightFit", "assumptions", "unknowns", "suggestedValidation"],
        properties: {
          id: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          summary: { type: "string", minLength: 1 },
          targetCustomer: { type: "string", minLength: 1 },
          whyItMightFit: { type: "string", minLength: 1 },
          assumptions: { type: "array", items: { type: "string" } },
          unknowns: { type: "array", items: { type: "string" } },
          suggestedValidation: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

type ResponsesApiPayload = {
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

const extractOutputText = (payload: ResponsesApiPayload) => {
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new Error("AI provider returned no structured text output");
};

const requestStructured = async <T>(options: {
  name: string;
  schema: object;
  instructions: string;
  input: string;
  validate: (value: unknown) => T;
}): Promise<T> => {
  const config = resolveLLMRuntimeConfig();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        store: false,
        instructions: options.instructions,
        input: options.input,
        text: {
          format: {
            type: "json_schema",
            name: options.name,
            strict: true,
            schema: options.schema,
          },
        },
      }),
    });

    const payload = (await response.json()) as ResponsesApiPayload;
    if (!response.ok) {
      throw new Error(payload.error?.message || `AI request failed (${response.status})`);
    }

    try {
      const text = extractOutputText(payload);
      return options.validate(JSON.parse(text));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Invalid structured output");
    }
  }

  throw new Error(`LLM output validation failed: ${lastError?.message ?? "unknown error"}`);
};

export class OpenAILLMClient implements LLMClient {
  async parseUserConstraints(request: ParseConstraintsRequest) {
    const trimmed = request.input.trim();
    if (!trimmed) throw new Error("自然文を入力してください");
    if (trimmed.length > 4000) throw new Error("自然文が長すぎます（4000文字以内）");

    return requestStructured({
      name: "market_constraint_suggestion",
      schema: constraintSchema,
      instructions:
        "あなたは市場調査アプリの入力整理担当です。ユーザーが明示した情報だけを構造化してください。不明な数値や条件を推測で埋めずnullにしてください。notesには曖昧な点や確認事項を短く日本語で入れてください。ランキングや市場評価は行わないでください。",
      input: JSON.stringify({ text: trimmed, currentConstraints: request.currentConstraints }),
      validate: parseConstraintSuggestion,
    });
  }

  async generateMarketHypotheses(request: GenerateHypothesesRequest) {
    const result = await requestStructured({
      name: "market_hypotheses",
      schema: hypothesesSchema,
      instructions:
        "あなたは市場機会の仮説生成担当です。入力条件に合いそうな市場仮説を5〜10件作ってください。これは未検証の仮説であり、需要・競争・収益性などの点数やランキングは付けないでください。事実が未確認ならassumptions/unknownsへ明示し、suggestedValidationには低コストで検証できる次の行動を日本語で書いてください。idは短い英数字ハイフン形式にしてください。",
      input: JSON.stringify(request.constraints),
      validate: (value) => {
        if (typeof value !== "object" || value === null || !("hypotheses" in value)) {
          throw new Error("Missing hypotheses array");
        }
        return parseMarketHypotheses((value as { hypotheses: unknown }).hypotheses);
      },
    });
    return result;
  }
}
