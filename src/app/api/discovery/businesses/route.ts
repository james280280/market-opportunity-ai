import { NextResponse } from "next/server";
import { getAIServiceError } from "@/lib/llm/service-error";
import { discoverBusinesses } from "@/lib/business-discovery/service";
import { parseDiscoveryRequest } from "@/lib/business-discovery/validation";
import { resolveLLMRuntimeConfig, runWithVercelOidcToken } from "@/lib/llm/openai-client";

export const runtime = "nodejs";
export const maxDuration = 300;

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const requestLog = new Map<string, number[]>();
const GATEWAY_CREDITS_URL = "https://ai-gateway.vercel.sh/v1/credits";

type GatewayCredits = {
  balance: number;
  totalUsed: number;
};

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

const readGatewayCredits = async (): Promise<GatewayCredits | null> => {
  try {
    const config = resolveLLMRuntimeConfig();
    if (config.provider !== "vercel-ai-gateway") return null;

    const response = await fetch(GATEWAY_CREDITS_URL, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { balance?: string; total_used?: string };
    const balance = Number(payload.balance);
    const totalUsed = Number(payload.total_used);
    if (!Number.isFinite(balance) || !Number.isFinite(totalUsed)) return null;
    return { balance, totalUsed };
  } catch {
    return null;
  }
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
      async () => {
        const creditsBefore = await readGatewayCredits();
        const discovery = await discoverBusinesses(profile, mode, request.signal);
        const creditsAfter = await readGatewayCredits();
        const runCostUsd = creditsBefore && creditsAfter
          ? Math.max(0, Number((creditsAfter.totalUsed - creditsBefore.totalUsed).toFixed(6)))
          : null;

        return {
          ...discovery,
          runCostUsd,
          creditsRemainingUsd: creditsAfter?.balance ?? null,
        };
      },
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
