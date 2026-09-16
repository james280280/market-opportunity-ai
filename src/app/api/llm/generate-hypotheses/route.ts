import { NextResponse } from "next/server";
import { OpenAILLMClient } from "@/lib/llm/openai-client";
import type { GenerateHypothesesRequest } from "@/lib/llm/types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isObject(body) || !isObject(body.constraints)) {
      return NextResponse.json({ error: "入力形式が正しくありません" }, { status: 400 });
    }

    const client = new OpenAILLMClient();
    const hypotheses = await client.generateMarketHypotheses(body as unknown as GenerateHypothesesRequest);
    return NextResponse.json({ hypotheses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "市場仮説の生成に失敗しました";
    const configurationError = message.includes("OPENAI_API_KEY") || message.includes("OPENAI_MODEL");
    return NextResponse.json({ error: message }, { status: configurationError ? 503 : 500 });
  }
}
