import { NextResponse } from "next/server";
import { getAIServiceError } from "@/lib/llm/service-error";
import { discoverBusinesses } from "@/lib/business-discovery/service";
import { parseDiscoveryRequest } from "@/lib/business-discovery/validation";
import { runWithVercelOidcToken } from "@/lib/llm/openai-client";

export const runtime = "nodejs";
export const maxDuration = 300;

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const requestLog = new Map<string, number[]>();

const getClientKey = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
};

const isRateLimited = (key: string) => {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(key, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(key, recent);
  return false;
};

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 25000) {
      return NextResponse.json({ error: "入力が大きすぎます" }, { status: 413 });
    }

    if (isRateLimited(getClientKey(request))) {
      return NextResponse.json(
        { error: "AI+Web検索は計算量が大きいため、少し時間を空けてからもう一度試してください。" },
        { status: 429 },
      );
    }

    const body = (await request.json()) as unknown;
    const { profile, mode } = parseDiscoveryRequest(body);
    const result = await runWithVercelOidcToken(
      request.headers.get("x-vercel-oidc-token"),
      () => discoverBusinesses(profile, mode, request.signal),
    );
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const serviceError = getAIServiceError(error);
    if (serviceError) return NextResponse.json({ error: serviceError.error }, { status: serviceError.status });
    const message = error instanceof Error ? error.message : "AI+Web検索に失敗しました";
    const authError =
      message.includes("AI authentication is not configured") ||
      message.includes("AI_GATEWAY_API_KEY") ||
      message.includes("OPENAI_API_KEY") ||
      message.includes("VERCEL_OIDC_TOKEN");
    const timeout = message.includes("Timeout") || message.includes("aborted") || message.includes("timed out");
    const badInput = error instanceof SyntaxError ||
      message.includes("入力") ||
      message.includes("予算") ||
      message.includes("月収") ||
      message.includes("リスク") ||
      message.includes("4000文字");

    return NextResponse.json(
      { error: message },
      { status: authError ? 503 : timeout ? 504 : badInput ? 400 : 500 },
    );
  }
}
