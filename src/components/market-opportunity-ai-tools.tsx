"use client";

import { useState } from "react";
import type { UserConstraints } from "@/lib/market-opportunity/types";
import type { GeneratedMarketHypothesis, ParsedConstraintSuggestion } from "@/lib/llm/types";
import { applyConstraintSuggestion } from "@/lib/llm/validation";

type Props = {
  constraints: UserConstraints;
  onApplyConstraints: (next: UserConstraints) => void;
};

type ApiError = { error?: string };

const readJson = async <T,>(response: Response): Promise<T> => {
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
};

const isAuthConfigurationError = (message: string) =>
  message.includes("AI authentication is not configured") ||
  message.includes("AI_GATEWAY_API_KEY") ||
  message.includes("OPENAI_API_KEY");

export const MarketOpportunityAiTools = ({ constraints, onApplyConstraints }: Props) => {
  const [suggestion, setSuggestion] = useState<ParsedConstraintSuggestion | null>(null);
  const [hypotheses, setHypotheses] = useState<GeneratedMarketHypothesis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const parseConstraints = async () => {
    setParsing(true);
    setError(null);
    try {
      const response = await fetch("/api/llm/parse-constraints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: constraints.freeText, currentConstraints: constraints }),
      });
      const payload = await readJson<{ suggestion: ParsedConstraintSuggestion }>(response);
      setSuggestion(payload.suggestion);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AIでの整理に失敗しました");
    } finally {
      setParsing(false);
    }
  };

  const generateHypotheses = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/llm/generate-hypotheses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ constraints }),
      });
      const payload = await readJson<{ hypotheses: GeneratedMarketHypothesis[] }>(response);
      setHypotheses(payload.hypotheses);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "候補案の作成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="grid gap-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-5">
      <div>
        <p className="text-sm font-semibold text-sky-800">AIに入力を手伝ってもらう</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          文章から条件を整理したり、新しい候補案を出したりできます。最終順位はAIではなく固定ルールで計算します。
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={parseConstraints} disabled={parsing || !constraints.freeText.trim()} className="rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {parsing ? "整理中…" : "文章から条件を整理"}
        </button>
        <button type="button" onClick={generateHypotheses} disabled={generating} className="rounded-full border border-sky-700 bg-white px-4 py-2 text-sm font-semibold text-sky-800 disabled:cursor-not-allowed disabled:opacity-50">
          {generating ? "考え中…" : "AIに新しい候補案を出してもらう"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {isAuthConfigurationError(error) ? "AI機能の接続設定がまだ完了していません。通常のランキング機能はそのまま使えます。" : error}
        </div>
      ) : null}

      {suggestion ? (
        <div className="rounded-xl bg-white p-4 ring-1 ring-sky-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">AIが読み取った条件</p>
              <p className="text-xs text-slate-500">勝手に変更はしません。内容を見てから反映できます。</p>
            </div>
            <button type="button" onClick={() => onApplyConstraints(applyConstraintSuggestion(constraints, suggestion))} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
              この内容を入力欄に入れる
            </button>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <SuggestionRow label="使える予算" value={suggestion.budget} />
            <SuggestionRow label="期間（月）" value={suggestion.timeframeMonths} />
            <SuggestionRow label="人数" value={suggestion.teamSize} />
            <SuggestionRow label="週に使える時間" value={suggestion.weeklyHours} />
            <SuggestionRow label="できること" value={suggestion.skills} />
            <SuggestionRow label="やりたくない・できないこと" value={suggestion.unavailableSkills} />
            <SuggestionRow label="地域" value={suggestion.region} />
            <SuggestionRow label="稼ぎ方" value={suggestion.preferredBusinessModel} />
            <SuggestionRow label="目標月売上" value={suggestion.targetMonthlyRevenue} />
            <SuggestionRow label="取れるリスク" value={suggestion.riskTolerance} />
            <SuggestionRow label="外したい分野" value={suggestion.excludedMarkets} />
          </dl>
          {suggestion.notes.length > 0 ? (
            <div className="mt-3 text-xs text-amber-800"><span className="font-semibold">まだ確認したいこと:</span> {suggestion.notes.join(" / ")}</div>
          ) : null}
        </div>
      ) : null}

      {hypotheses.length > 0 ? (
        <div className="grid gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            下の案はAIが考えたアイデア段階です。まだ実際の市場データで確認していないので、ランキングには入れていません。
          </div>
          {hypotheses.map((hypothesis) => (
            <article key={hypothesis.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-amber-700">AIが出した候補案</p>
              <h3 className="mt-1 font-semibold text-slate-900">{hypothesis.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{hypothesis.summary}</p>
              <p className="mt-2 text-sm"><span className="font-semibold">誰向け？:</span> {hypothesis.targetCustomer}</p>
              <p className="mt-1 text-sm"><span className="font-semibold">合いそうな理由:</span> {hypothesis.whyItMightFit}</p>
              <MiniList title="今はこう考えている" items={hypothesis.assumptions} />
              <MiniList title="まだ分からないこと" items={hypothesis.unknowns} />
              <MiniList title="次に試すこと" items={hypothesis.suggestedValidation} />
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};

const SuggestionRow = ({ label, value }: { label: string; value: unknown }) => (
  <div className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2">
    <dt className="font-medium text-slate-500">{label}</dt>
    <dd className="text-slate-900">{value === null ? "まだ分からない" : Array.isArray(value) ? value.join(", ") || "なし" : String(value)}</dd>
  </div>
);

const MiniList = ({ title, items }: { title: string; items: string[] }) => (
  <div className="mt-3 text-xs text-slate-600">
    <p className="font-semibold text-slate-800">{title}</p>
    <ul className="mt-1 list-disc space-y-1 pl-5">
      {(items.length ? items : ["なし"]).map((item) => <li key={`${title}-${item}`}>{item}</li>)}
    </ul>
  </div>
);
