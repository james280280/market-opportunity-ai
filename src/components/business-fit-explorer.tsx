"use client";

import { useEffect, useRef, useState } from "react";
import { defaultBusinessProfile } from "@/lib/business-fit/data";
import { formatYen } from "@/lib/business-fit/engine";
import type { BusinessProfile } from "@/lib/business-fit/types";
import { parseDiscoveryRequest } from "@/lib/business-discovery/validation";
import type { BusinessDiscoveryResponse, LiveBusinessResult } from "@/lib/business-discovery/types";

const splitCsv = (value: string) => value.split(/[,、，\n]/).map((item) => item.trim()).filter(Boolean);
type ApiError = { error?: string };

const DISCOVERY_TIMEOUT_MS = 285000;

export const BusinessFitExplorer = () => {
  const [draft, setDraft] = useState<BusinessProfile>(defaultBusinessProfile);
  const [interestsInput, setInterestsInput] = useState(defaultBusinessProfile.interests.join(", "));
  const [avoidInput, setAvoidInput] = useState(defaultBusinessProfile.avoid.join(", "));
  const [result, setResult] = useState<BusinessDiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  const setField = <Key extends keyof BusinessProfile>(key: Key, value: BusinessProfile[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const runDiscovery = async () => {
    if (activeRequest.current) return;
    try {
      parseDiscoveryRequest({ profile: draft });
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "入力を確認してください");
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setResult(null);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/discovery/businesses", {
        method: "POST",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(DISCOVERY_TIMEOUT_MS)]),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: draft }),
      });
      const payload = (await response.json()) as BusinessDiscoveryResponse & ApiError;
      if (!response.ok) throw new Error(payload.error || `検索に失敗しました (${response.status})`);
      setResult(payload);
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(requestError instanceof Error && requestError.name === "TimeoutError"
          ? "調査が5分近くかかっても完了しませんでした。通信状態を確認して再実行してください。"
          : requestError instanceof Error ? requestError.message : "AI+Web検索に失敗しました");
      }
    } finally {
      activeRequest.current = null;
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 pb-12 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <form
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"
          onSubmit={(event) => { event.preventDefault(); void runDiscovery(); }}
        >
          <div className="mb-6">
            <p className="text-sm font-semibold text-violet-700">条件を入力</p>
            <h2 className="mt-2 text-2xl font-bold">分かる範囲だけでOK</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">最初の小さな検証予算と、現実に使える時間を入れるほど結果が絞れます。</p>
          </div>

          <fieldset disabled={loading} className="grid min-w-0 gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">どんなことをしたい？</span>
              <span className="text-xs text-slate-500">例：AIを使いたい、1人で始めたい、営業は苦手、半年以内に売上がほしい</span>
              <textarea
                className="min-h-28 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                maxLength={4000}
                value={draft.freeText}
                onChange={(event) => setField("freeText", event.target.value)}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <NumberField label="最初に試せる予算" help="本格開業費ではなく検証用" value={draft.startingBudget} onChange={(value) => setField("startingBudget", value)} />
              <NumberField label="1週間に使える時間" help="だいたいでOK" value={draft.weeklyHours} onChange={(value) => setField("weeklyHours", value)} />
              <NumberField label="将来ほしい月収" help="Web調査後に現実性を評価" value={draft.targetMonthlyIncome} onChange={(value) => setField("targetMonthlyIncome", value)} />
              <NumberField label="何か月以内に初売上がほしい？" help="迷ったら3か月" value={draft.timeToFirstRevenueMonths} onChange={(value) => setField("timeToFirstRevenueMonths", value)} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ComfortField label="営業・提案" low="苦手" high="得意" value={draft.salesComfort} onChange={(value) => setField("salesComfort", value)} />
              <ComfortField label="PC・アプリ" low="苦手" high="得意" value={draft.technicalComfort} onChange={(value) => setField("technicalComfort", value)} />
              <ComfortField label="AI活用" low="初心者" high="得意" value={draft.aiComfort} onChange={(value) => setField("aiComfort", value)} />
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">興味があること</span>
              <span className="text-xs text-slate-500">カンマ区切り。例：AI, ゲーム, 動画, ファッション</span>
              <input className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500" value={interestsInput} onChange={(event) => { setInterestsInput(event.target.value); setField("interests", splitCsv(event.target.value)); }} />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">絶対にやりたくないこと</span>
              <span className="text-xs text-slate-500">空欄でもOK。例：在庫, 顔出し, 店舗</span>
              <input className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500" value={avoidInput} onChange={(event) => { setAvoidInput(event.target.value); setField("avoid", splitCsv(event.target.value)); }} />
            </label>

            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
              <Toggle label="できれば1人でやりたい" checked={draft.solo} onChange={(value) => setField("solo", value)} />
              <Toggle label="在庫を持ってもOK" checked={draft.inventoryOkay} onChange={(value) => setField("inventoryOkay", value)} />
              <Toggle label="顔出ししてもOK" checked={draft.faceOnCameraOkay} onChange={(value) => setField("faceOnCameraOkay", value)} />
              <Toggle label="地域のお店相手でもOK" checked={draft.localServiceOkay} onChange={(value) => setField("localServiceOkay", value)} />
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">どれくらい失敗リスクを取れる？</span>
              <select className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500" value={draft.riskTolerance} onChange={(event) => setField("riskTolerance", event.target.value as BusinessProfile["riskTolerance"])}>
                <option value="low">低め：できるだけ安全に</option>
                <option value="medium">ふつう：多少の失敗はOK</option>
                <option value="high">高め：伸びしろ優先</option>
              </select>
            </label>

            <button className="rounded-full bg-violet-700 px-6 py-3.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loading}>
              {loading ? "100候補を生成・調査中…" : "AI + Webで100候補から探す"}
            </button>
          </fieldset>
        </form>

        <aside className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-sky-300">検索の流れ</p>
          <h2 className="mt-2 text-xl font-semibold">量より、絞り込みの精度を上げる</h2>
          <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-200">
            <Stage number="1" text="25候補 × 4回で100候補を作り、重複を除去" />
            <Stage number="2" text="予算・時間・スキル・運営条件で30候補まで絞る" />
            <Stage number="3" text="20候補を簡易Web調査して需要・成長・競争を確認" />
            <Stage number="4" text="上位10候補を詳細調査して最終比較" />
          </div>
          <div className="mt-6 rounded-2xl bg-slate-800 p-4 text-sm leading-6 text-slate-300">
            未調査の売上額は順位に使いません。市場性、自分との相性、証拠の信頼度、情報量を別々に表示します。
          </div>
        </aside>
      </section>

      {loading ? (
        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-sm text-violet-950">
          <p className="font-semibold">候補生成 → 条件選別 → 簡易Web調査 → 詳細Web調査の順で処理しています。</p>
          <p className="mt-2 text-violet-800">100候補の生成とWeb調査を行うため、通常1〜4分ほどかかる場合があります。この画面を閉じずに待ってください。</p>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          <p className="font-semibold">検索を完了できませんでした</p>
          <p className="mt-2">{error}</p>
        </section>
      ) : null}

      {result ? <LiveRanking result={result} /> : null}
    </main>
  );
};

const LiveRanking = ({ result }: { result: BusinessDiscoveryResponse }) => (
  <section className="grid gap-5">
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-violet-700">AI + Web 調査結果</p>
      <h2 className="mt-2 text-2xl font-bold">100候補から絞った上位{result.ranking.length}件</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        生成 {result.poolSize}件 → 条件選別 {result.preselectedCount}件 → 簡易調査 {result.screenedCount}件 → 詳細調査 {result.researchedCount}件
        {result.cacheHits > 0 ? `（再利用できた調査 ${result.cacheHits}件）` : ""}
      </p>
      {result.runCostUsd != null || result.creditsRemainingUsd != null ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {result.runCostUsd != null ? (
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">今回のAI Gateway消費額</p>
              <p className="mt-1 text-2xl font-bold text-emerald-950">${result.runCostUsd.toFixed(4)}</p>
              <p className="mt-1 text-[11px] leading-4 text-emerald-800">検索前後のAI Gateway総使用額の差分です。</p>
            </div>
          ) : null}
          {result.creditsRemainingUsd != null ? (
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-xs font-semibold text-sky-700">AIクレジット残高</p>
              <p className="mt-1 text-2xl font-bold text-sky-950">${result.creditsRemainingUsd.toFixed(4)}</p>
              <p className="mt-1 text-[11px] leading-4 text-sky-800">Vercel AI Gatewayの検索完了時点の残高です。</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {result.warnings.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          {result.warnings.map((warning) => <p key={warning}>・{warning}</p>)}
        </div>
      ) : null}
    </div>

    {result.ranking.map((item, index) => <ResultCard key={item.business.id} item={item} rank={index + 1} showPlan={index < 3} />)}
  </section>
);

const ResultCard = ({ item, rank, showPlan }: { item: LiveBusinessResult; rank: number; showPlan: boolean }) => (
  <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-800">#{rank}</span>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.business.category}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.researchStatus === "verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
        {item.researchStatus === "verified" ? "詳細調査済み" : item.researchStatus === "screened" ? "簡易調査" : "根拠限定"}
      </span>
    </div>
    <h3 className="mt-4 text-2xl font-bold">{item.business.name}</h3>
    <p className="mt-2 text-sm leading-6 text-slate-600">{item.business.summary}</p>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Score label="市場性" value={item.marketOpportunityScore} help="需要・成長・競争・収益性・始めやすさ" />
      <Score label="あなたとの相性" value={item.personalFitScore} help="予算・時間・スキル・目標・運営条件" />
      <Score label="証拠の信頼度" value={item.evidenceConfidence} help="Web根拠の質と一致度" />
      <Score label="情報量" value={item.evidenceCoverage} help="今回確認できた根拠の充足度" />
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-500">調査まとめ</p>
        <p className="mt-2 text-sm leading-6 text-slate-800">{item.researchSummary}</p>
      </div>
      <div className="rounded-2xl bg-rose-50 p-4">
        <p className="text-xs font-semibold text-rose-700">最大のリスク</p>
        <p className="mt-2 text-sm leading-6 text-rose-900">{item.maxRisk}</p>
      </div>
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 p-4 text-sm">
        <p className="font-semibold">現実的な条件</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-slate-600">
          <dt>試す予算目安</dt><dd className="text-right font-medium text-slate-900">{formatYen(item.business.requiredBudget)}</dd>
          <dt>週の必要時間</dt><dd className="text-right font-medium text-slate-900">約{item.business.requiredWeeklyHours}時間</dd>
          <dt>初売上まで</dt><dd className="text-right font-medium text-slate-900">約{item.business.monthsToFirstRevenue}か月</dd>
          <dt>最低人数</dt><dd className="text-right font-medium text-slate-900">{item.business.minimumTeamSize}人</dd>
        </dl>
      </div>
      <div className="rounded-2xl border border-slate-200 p-4 text-sm">
        <p className="font-semibold">向いている理由</p>
        <div className="mt-3 grid gap-2 text-slate-700">
          {item.topReasons.length > 0 ? item.topReasons.map((reason) => <p key={reason}>・{reason}</p>) : <p>突出した適合要因はありません。各スコアを確認してください。</p>}
        </div>
      </div>
    </div>

    {showPlan ? (
      <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5">
        <p className="font-semibold text-violet-950">最初の7日間の検証プラン</p>
        <ol className="mt-3 grid gap-2 text-sm leading-6 text-violet-950">
          {item.validationPlan.map((step, index) => <li key={`${index}-${step}`}><span className="mr-2 font-bold">Day {index + 1}</span>{step}</li>)}
        </ol>
      </div>
    ) : null}

    <div className="mt-5">
      <p className="text-xs font-semibold text-slate-500">参照したWeb情報</p>
      {item.sources.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {item.sources.map((source) => (
            <a key={source.url} className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
          ))}
        </div>
      ) : <p className="mt-2 text-xs text-slate-500">今回確認できたWeb根拠はありません。</p>}
    </div>
  </article>
);

const Stage = ({ number, text }: { number: string; text: string }) => (
  <div className="flex gap-3 rounded-2xl bg-slate-800 p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-bold text-slate-900">{number}</span><p>{text}</p></div>
);

const Score = ({ label, value, help }: { label: string; value: number; help: string }) => (
  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{Math.round(value)}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{help}</p></div>
);

const NumberField = ({ label, help, value, onChange }: { label: string; help: string; value: number; onChange: (value: number) => void }) => (
  <label className="grid gap-2"><span className="text-sm font-semibold">{label}</span><span className="text-xs text-slate-500">{help}</span><input className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500" type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
);

const ComfortField = ({ label, low, high, value, onChange }: { label: string; low: string; high: string; value: number; onChange: (value: number) => void }) => (
  <label className="grid gap-2"><span className="text-sm font-semibold">{label}</span><input type="range" min={1} max={5} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} /><span className="flex justify-between text-xs text-slate-500"><span>{low}</span><strong className="text-slate-900">{value}/5</strong><span>{high}</span></span></label>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) => (
  <label className="flex items-center justify-between gap-4 text-sm"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>
);
