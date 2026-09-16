import { NextResponse } from "next/server";
import { getAIServiceError } from "@/lib/llm/service-error";
import { OpenAILLMClient, runWithVercelOidcToken } from "@/lib/llm/openai-client";
import type { GenerateHypothesesRequest } from "@/lib/llm/types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isConfigurationError = (message: string) =>
  message.includes("AI authentication is not configured") ||
  message.includes("AI_GATEWAY_API_KEY") ||
  message.includes("OPENAI_API_KEY");

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isObject(body) || !isObject(body.constraints)) {
      return NextResponse.json({ error: "入力形式が正しくありません" }, { status: 400 });
    }

    const client = new OpenAILLMClient();
    const hypotheses = await runWithVercelOidcToken(
      request.headers.get("x-vercel-oidc-token"),
      () => client.generateMarketHypotheses(body as unknown as GenerateHypothesesRequest),
    );
    return NextResponse.json({ hypotheses });
  } catch (error) {
    const serviceError = getAIServiceError(error);
    if (serviceError) return NextResponse.json({ error: serviceError.error }, { status: serviceError.status });
    const message = error instanceof Error ? error.message : "市場仮説の生成に失敗しました";
    return NextResponse.json({ error: message }, { status: isConfigurationError(message) ? 503 : 500 });
  }
}

