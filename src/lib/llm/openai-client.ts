import type { LLMClient, GenerateHypothesesRequest, ParseConstraintsRequest } from "./types";
import { parseConstraintSuggestion, parseMarketHypotheses } from "./validation";

const RESPONSES_URL = "https://api.openai.com/v1/responses";

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
  throw new Error("OpenAI returned no structured text output");
};

const getConfig = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  if (!model) throw new Error("OPENAI_MODEL is not configured");
  return { apiKey, model };
};

const requestStructured = async <T>(options: {
  name: string;
  schema: object;
  instructions: string;
  input: string;
  validate: (value: unknown) => T;
}): Promise<T> => {
  const { apiKey, model } = getConfig();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
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
      throw new Error(payload.error?.message || `OpenAI request failed (${response.status})`);
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
