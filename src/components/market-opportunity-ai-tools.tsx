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
      setError(requestError instanceof Error ? requestError.message : "AI条件整理に失敗しました");
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
      setError(requestError instanceof Error ? requestError.message : "市場仮説の生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="grid gap-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-5">
      <div>
        <p className="text-sm font-semibold text-sky-800">AI補助（Phase 2）</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          AIは入力整理と市場仮説の生成だけを担当します。市場の点数・最終ランキングはAIに決めさせません。
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={parseConstraints}
          disabled={parsing || !constraints.freeText.trim()}
          className="rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {parsing ? "整理中…" : "AIで条件を整理"}
        </button>
        <button
          type="button"
          onClick={generateHypotheses}
          disabled={generating}
          className="rounded-full border border-sky-700 bg-white px-4 py-2 text-sm font-semibold text-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "生成中…" : "AIで市場仮説を生成"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
          {error.includes("OPENAI_") ? (
            <p className="mt-1 text-xs">サーバー側に OPENAI_API_KEY と OPENAI_MODEL の設定が必要です。</p>
          ) : null}
        </div>
      ) : null}

      {suggestion ? (
        <div className="rounded-xl bg-white p-4 ring-1 ring-sky-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">AIが整理した条件候補</p>
              <p className="text-xs text-slate-500">自動確定はしません。内容を確認してから反映してください。</p>
            </div>
            <button
              type="button"
              onClick={() => onApplyConstraints(applyConstraintSuggestion(constraints, suggestion))}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              この候補を入力欄へ反映
            </button>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <SuggestionRow label="予算" value={suggestion.budget} />
            <SuggestionRow label="期間(月)" value={suggestion.timeframeMonths} />
            <SuggestionRow label="人数" value={suggestion.teamSize} />
            <SuggestionRow label="週時間" value={suggestion.weeklyHours} />
            <SuggestionRow label="スキル" value={suggestion.skills} />
            <SuggestionRow label="不足スキル" value={suggestion.unavailableSkills} />
            <SuggestionRow label="地域" value={suggestion.region} />
            <SuggestionRow label="ビジネスモデル" value={suggestion.preferredBusinessModel} />
            <SuggestionRow label="目標月商" value={suggestion.targetMonthlyRevenue} />
            <SuggestionRow label="リスク許容度" value={suggestion.riskTolerance} />
            <SuggestionRow label="除外市場" value={suggestion.excludedMarkets} />
          </dl>
          {suggestion.notes.length > 0 ? (
            <div className="mt-3 text-xs text-amber-800">
              <span className="font-semibold">確認事項:</span> {suggestion.notes.join(" / ")}
            </div>
          ) : null}
        </div>
      ) : null}

      {hypotheses.length > 0 ? (
        <div className="grid gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            これはAIが生成した未検証の仮説です。実データによる評価はまだ行っておらず、既存ランキングには混ぜていません。
          </div>
          {hypotheses.map((hypothesis) => (
            <article key={hypothesis.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-amber-700">AI仮説・未評価</p>
              <h3 className="mt-1 font-semibold text-slate-900">{hypothesis.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{hypothesis.summary}</p>
              <p className="mt-2 text-sm"><span className="font-semibold">対象:</span> {hypothesis.targetCustomer}</p>
              <p className="mt-1 text-sm"><span className="font-semibold">条件に合いそうな理由:</span> {hypothesis.whyItMightFit}</p>
              <MiniList title="前提" items={hypothesis.assumptions} />
              <MiniList title="未確認" items={hypothesis.unknowns} />
              <MiniList title="次の検証" items={hypothesis.suggestedValidation} />
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
    <dd className="text-slate-900">{value === null ? "未確定" : Array.isArray(value) ? value.join(", ") || "なし" : String(value)}</dd>
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
