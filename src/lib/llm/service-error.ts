// Keep provider billing/authentication details out of the user-facing UI.
export const getAIServiceError = (error: unknown): { error: string; status: number } | null => {
  const message = error instanceof Error ? error.message : "";
  if (/valid credit card|add a card|payment required|billing|insufficient_quota|insufficient credits/i.test(message)) {
    return { error: "AI検索の請求設定または利用残高の確認が必要です。サイト管理者がAIサービスの設定を確認してください。サンプル診断は引き続き使えます。", status: 503 };
  }
  if (/AI authentication is not configured|AI_GATEWAY_API_KEY|OPENAI_API_KEY|VERCEL_OIDC_TOKEN|invalid api key|unauthorized/i.test(message)) {
    return { error: "AIサービスへの接続設定を確認する必要があります。サイト管理者にお知らせください。サンプル診断は引き続き使えます。", status: 503 };
  }
  if ((error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) || /timed out|timeout|aborted/i.test(message)) {
    return { error: "AIの処理が時間内に終わりませんでした。少し待ってから、もう一度試してください。", status: 504 };
  }
  return null;
};
