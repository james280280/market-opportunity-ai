import { NextResponse } from "next/server";
import { getAIServiceError } from "@/lib/llm/service-error";
import { OpenAILLMClient, runWithVercelOidcToken } from "@/lib/llm/openai-client";
import type { ParseConstraintsRequest } from "@/lib/llm/types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isConfigurationError = (message: string) =>
  message.includes("AI authentication is not configured") ||
  message.includes("AI_GATEWAY_API_KEY") ||
  message.includes("OPENAI_API_KEY");

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isObject(body) || typeof body.input !== "string" || !isObject(body.currentConstraints)) {
      return NextResponse.json({ error: "入力形式が正しくありません" }, { status: 400 });
    }
    if (body.input.length > 4000) {
      return NextResponse.json({ error: "自然文は4000文字以内にしてください" }, { status: 400 });
    }

    const client = new OpenAILLMClient();
    const suggestion = await runWithVercelOidcToken(
      request.headers.get("x-vercel-oidc-token"),
      () => client.parseUserConstraints(body as unknown as ParseConstraintsRequest),
    );
    return NextResponse.json({ suggestion });
  } catch (error) {
    const serviceError = getAIServiceError(error);
    if (serviceError) return NextResponse.json({ error: serviceError.error }, { status: serviceError.status });
    const message = error instanceof Error ? error.message : "AI条件整理に失敗しました";
    return NextResponse.json({ error: message }, { status: isConfigurationError(message) ? 503 : 500 });
  }
}

