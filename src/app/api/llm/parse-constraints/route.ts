import { NextResponse } from "next/server";
import { OpenAILLMClient } from "@/lib/llm/openai-client";
import type { ParseConstraintsRequest } from "@/lib/llm/types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
    const suggestion = await client.parseUserConstraints(body as unknown as ParseConstraintsRequest);
    return NextResponse.json({ suggestion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI条件整理に失敗しました";
    const configurationError = message.includes("OPENAI_API_KEY") || message.includes("OPENAI_MODEL");
    return NextResponse.json({ error: message }, { status: configurationError ? 503 : 500 });
  }
}
