"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { businessCandidates, defaultBusinessProfile } from "@/lib/business-fit/data";
import { formatYen, rankBusinesses } from "@/lib/business-fit/engine";
import type { BusinessDiscoveryMode, BusinessProfile } from "@/lib/business-fit/types";
import { parseDiscoveryRequest } from "@/lib/business-discovery/validation";
import type { BusinessDiscoveryResponse, LiveBusinessResult } from "@/lib/business-discovery/types";

const splitCsv = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

type ApiError = { error?: string };

export const BusinessFitExplorer = ({ mode }: { mode: BusinessDiscoveryMode }) => {
  const [draft, setDraft] = useState<BusinessProfile>(defaultBusinessProfile);
  const [submitted, setSubmitted] = useState<BusinessProfile>(defaultBusinessProfile);
  const [hasRun, setHasRun] = useState(false);
  const [liveResult, setLiveResult] = useState<BusinessDiscoveryResponse | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  const ranking = useMemo(() => rankBusinesses(submitted, businessCandidates, mode), [submitted, mode]);

  const setField = <Key extends keyof BusinessProfile>(key: Key, value: BusinessProfile[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const runQuickRanking = () => {
    try {
      setSubmitted(parseDiscoveryRequest({ profile: draft, mode }).profile);
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : "入力を確認してください");
      return;
    }
    setHasRun(true);
    setLiveResult(null);
    setLiveError(null);
  };

  const runLiveDiscovery = async () => {
    if (activeRequest.current) return;
    try {
      parseDiscoveryRequest({ profile: draft, mode });
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : "入力を確認してください");
      return;
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    setLiveResult(null);
    setHasRun(false);
    setLiveLoading(true);
    setLiveError(null);
    setSubmitted({ ...draft });
    try {
      const response = await fetch("/api/discovery/businesses", {
        method: "POST",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(115000)]),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: draft, mode }),
      });
      const payload = (await response.json()) as BusinessDiscoveryResponse & ApiError;
      if (!response.ok) throw new Error(payload.error || `検索に失敗しました (${response.status})`);
      setLiveResult(payload);
      setHasRun(false);
    } catch (error) {
      if (!controller.signal.aborted) {
        setLiveError(error instanceof Error && error.name === "TimeoutError"
          ? "調査が時間内に終わりませんでした。少し待って再試行してください。"
          : error instanceof Error ? error.message : "AI+Web検索に失敗しました");
      }
    } finally {
      activeRequest.current = null;
      setLiveLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            runQuickRanking();
          }}
        >
          <div className="mb-6">
            <p className="text-sm font-semibold text-violet-700">あなた向け診断</p>
            <h2 className="mt-2 text-2xl font-bold">分かる範囲だけ入力</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              予算が少なくても大丈夫。いきなり本格開業する金額ではなく、まず試すための小さな予算で比較します。
            </p>
          </div>

          <fieldset disabled={liveLoading} className="grid min-w-0 gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">どんなことをしたい？</span>
              <span className="text-xs text-slate-500">例：「AIを使いたい」「1人でやりたい」「営業は苦手」など普通の言葉でOK</span>
              <textarea
                className="min-h-28 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                maxLength={4000}
                value={draft.freeText}
                onChange={(event) => setField("freeText", event.target.value)}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <NumberField label="まず試すために使える予算" help="本格開業の総額ではなく、最初のテスト予算" value={draft.startingBudget} onChange={(value) => setField("startingBudget", value)} />
              <NumberField label="1週間に使える時間" help="だいたいでOK" value={draft.weeklyHours} onChange={(value) => setField("weeklyHours", value)} />
              <NumberField label="将来ほしい月収" help="最初から達成する必要はありません" value={draft.targetMonthlyIncome} onChange={(value) => setField("targetMonthlyIncome", value)} />
              <NumberField label="何か月以内に初売上がほしい？" help="迷ったら3か月" value={draft.timeToFirstRevenueMonths} onChange={(value) => setField("timeToFirstRevenueMonths", value)} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ComfortField label="人に売り込むのは得意？" low="苦手" high="得意" value={draft.salesComfort} onChange={(value) => setField("salesComfort", value)} />
              <ComfortField label="PCやアプリ操作は得意？" low="苦手" high="得意" value={draft.technicalComfort} onChange={(value) => setField("technicalComfort", value)} />
              <ComfortField label="AIを使うのは得意？" low="初心者" high="得意" value={draft.aiComfort} onChange={(value) => setField("aiComfort", value)} />
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">興味があること</span>
              <span className="text-xs text-slate-500">カンマで区切る。例：AI, ゲーム, 動画, ファッション</span>
              <input className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500" value={draft.interests.join(", ")} onChange={(event) => setField("interests", splitCsv(event.target.value))} />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">絶対にやりたくないこと</span>
              <span className="text-xs text-slate-500">空欄でもOK。例：営業, 店舗, 広告</span>
              <input className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500" value={draft.avoid.join(", ")} onChange={(event) => setField("avoid", splitCsv(event.target.value))} />
            </label>

            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
              <Toggle label="できれば1人でやりたい" checked={draft.solo} onChange={(value) => setField("solo", value)} />
              <Toggle label="在庫を持ってもOK" checked={draft.inventoryOkay} onChange={(value) => setField("inventoryOkay", value)} />
              <Toggle label="顔出ししてもOK" checked={draft.faceOnCameraOkay} onChange={(value) => setField("faceOnCameraOkay", value)} />
              <Toggle label="近所のお店相手の仕事もOK" checked={draft.localServiceOkay} onChange={(value) => setField("localServiceOkay", value)} />
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">どれくらい失敗リスクを取れる？</span>
              <select className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500" value={draft.riskTolerance} onChange={(event) => setField("riskTolerance", event.target.value as BusinessProfile["riskTolerance"])}>
                <option value="low">低め：できるだけ安全に</option>
                <option value="medium">ふつう：多少の失敗はOK</option>
                <option value="high">高め：伸びしろ優先</option>
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <button className="rounded-full border border-violet-300 bg-white px-6 py-3 text-sm font-semibold text-violet-800 hover:bg-violet-50" type="submit" disabled={liveLoading}>
                すぐおすすめを見る
              </button>
              <button
                className="rounded-full bg-violet-700 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={liveLoading}
                onClick={runLiveDiscovery}
              >
                {liveLoading ? "AIとWebで調査中…" : "AI + Webで100候補から探す"}
              </button>
            </div>

            <p className="text-center text-xs leading-5 text-slate-500">
              「すぐおすすめ」は仮データ10件です。AI+Web検索は100案を作り、条件に合う最大15案を現在のWeb情報で調べて最大10件を出します。
            </p>
          </fieldset>
        </form>

        <aside className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold">2つの探し方</h2>
          <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-200">
            <p><span className="font-semibold text-white">すぐおすすめ</span>：10個のサンプル候補で瞬時に確認。使い方を試す用。</p>
            <p><span className="font-semibold text-white">AI + Web</span>：あなたの条件から100個の事業案を作り、上位候補をWebで現在の需要・競争・収益性まで調査。</p>
            <p><span className="font-semibold text-white">あなたとの相性</span>：予算、時間、得意なこと、売上までの速さ、リスクなどから固定ルールで計算。</p>
            <p><span className="font-semibold text-white">市場の強さ</span>：Web調査時は需要・成長・競争・収益性・始めやすさから計算。</p>
            <p className="rounded-2xl bg-slate-800 p-4 text-slate-300">AI+Web検索は通常より時間がかかります。検索結果には参照したサイトを表示します。</p>
          </div>
        </aside>
      </section>

      {liveLoading ? (
        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6 text-sm text-violet-950">
          <p className="font-semibold">100候補を作って、Web調査しています。</p>
          <p className="mt-2 text-violet-800">候補作成 → 条件に合う最大15件に絞る → 現在のWeb情報を調査 → 最大10件を表示、の順で進みます。</p>
        </section>
      ) : null}

      {liveError ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          <p className="font-semibold">入力または調査内容を確認してください</p>
          <p className="mt-2">{liveError}</p>
          <p className="mt-2 text-xs">上の「すぐおすすめ」はAI接続なしでも使えます。</p>
        </section>
      ) : null}

      {liveResult ? <LiveRanking result={liveResult} /> : null}

      {hasRun ? (
        <section className="grid gap-4">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-violet-700">サンプル候補 {ranking.length}件</p>
            <h2 className="mt-2 text-2xl font-bold">{mode === "hybrid" ? "市場の強さと自分との相性を両方見た結果" : "自分に合いやすい順"}</h2>
            <p className="mt-2 text-sm text-slate-600">これは固定のサンプル候補です。より広く探す場合は上の「AI + Webで100候補から探す」を使ってください。</p>
          </div>

          {ranking.map((result, index) => (
            <article key={result.business.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-800">#{index + 1}</span>
                    <h3 className="text-xl font-semibold">{result.business.name}</h3>
                    {result.blocked ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">条件を変えれば候補</span> : <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">候補にしやすい</span>}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{result.business.summary}</p>
                  <p className="mt-3 text-sm"><span className="font-semibold">合いやすい理由:</span> {result.topReasons.join(" / ") || "強く合う条件はまだ見つかっていません"}</p>
                  <p className="mt-2 text-sm"><span className="font-semibold">注意点:</span> {result.business.maxRisk}</p>
                  {result.blockers.length > 0 ? (
                    <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                      <span className="font-semibold">今の条件だと難しいところ:</span> {result.blockers.join(" / ")}
                    </div>
                  ) : null}
                </div>

                <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[430px]">
                  <Score label="あなたとの相性" help="予算・時間・得意なこととの合いやすさ" value={result.personalFitScore} />
                  <Score label="市場の強さ" help="サンプル用の仮スコア" value={result.marketOpportunityScore} />
                  <Score label="総合" help="市場と相性を半分ずつ" value={result.combinedScore} emphasize={mode === "hybrid"} />
                </div>
              </div>

              <ResultDetails
                breakdown={result.breakdown}
                budget={result.business.requiredBudget}
                weeklyHours={result.business.requiredWeeklyHours}
                months={result.business.monthsToFirstRevenue}
                first7Days={result.business.first7Days}
              />
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
};

const LiveRanking = ({ result }: { result: BusinessDiscoveryResponse }) => (
  <section className="grid gap-4">
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-violet-200">
      <p className="text-sm font-semibold text-violet-700">AI + Web 調査結果</p>
      <h2 className="mt-2 text-2xl font-bold">{result.poolSize}候補から絞ったTOP {result.ranking.length}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        AIが{result.poolSize}案を作成 → あなたとの相性で{result.shortlistedCount}案に絞る → Webで{result.researchedCount}案を調査しました。
        {result.mode === "hybrid" ? "順位は相性50% + 市場の強さ50%。" : "順位は相性70% + 市場の強さ30%。"}
        市場の点数は根拠の確かさに応じて補正しています。確かさは成功確率ではありません。
      </p>
    </div>

    {result.warnings.map((warning) => <p role="status" key={warning} className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{warning}</p>)}
    {result.ranking.map((item, index) => <LiveResultCard key={item.business.id} result={item} index={index} />)}
  </section>
);

const LiveResultCard = ({ result, index }: { result: LiveBusinessResult; index: number }) => (
  <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
    <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-800">#{index + 1}</span>
          <h3 className="text-xl font-semibold">{result.business.name}</h3>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">{result.researchStatus === "verified" ? "参照元あり" : result.researchStatus === "unverified" ? "参照元を確認できず" : "Web調査未完了"}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{result.business.summary}</p>
        <p className="mt-3 text-sm"><span className="font-semibold">合いやすい理由:</span> {result.topReasons.join(" / ") || "強く合う条件はまだ見つかっていません"}</p>
        <p className="mt-2 text-sm"><span className="font-semibold">注意点:</span> {result.business.maxRisk}</p>
        <div className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-950 ring-1 ring-sky-100">
          <p className="font-semibold">今の市場を調べた結果</p>
          <p className="mt-1">{result.researchSummary}</p>
          <p className="mt-2 text-xs text-sky-800">調査の確かさ: {Math.round(result.confidence)}点</p>
          {result.sources.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-800 underline decoration-sky-300 underline-offset-2 ring-1 ring-sky-200">
                  {source.title}
                </a>
              ))}
            </div>
          ) : <p className="mt-2 text-xs text-amber-800">参照URLを確認できないため、市場の強さは暫定50点です。</p>}
        </div>
      </div>

      <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[430px]">
        <Score label="あなたとの相性" help="予算・時間・得意なこととの合いやすさ" value={result.personalFitScore} />
        <Score label="市場の強さ" help="根拠の確かさを反映・未評価は50点" value={result.marketOpportunityScore} />
        <Score label="AI+Web総合" help="このランキングに使った点数" value={result.finalScore} emphasize />
      </div>
    </div>

    <ResultDetails
      breakdown={result.breakdown}
      budget={result.business.requiredBudget}
      weeklyHours={result.business.requiredWeeklyHours}
      months={result.business.monthsToFirstRevenue}
      first7Days={result.business.first7Days}
    />
  </article>
);

const ResultDetails = ({ breakdown, budget, weeklyHours, months, first7Days }: { breakdown: LiveBusinessResult["breakdown"]; budget: number; weeklyHours: number; months: number; first7Days: string[] }) => (
  <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
      {Object.entries(breakdown).map(([key, value]) => (
        <div key={key} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">{breakdownLabels[key as keyof typeof breakdownLabels]}</p>
          <p className="mt-1 font-semibold">{Math.round(value)}点</p>
        </div>
      ))}
    </div>
    <div className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
      <p className="text-sm font-semibold text-violet-900">最初の7日でやること</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
        {first7Days.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <div className="mt-3 text-xs leading-5 text-slate-600">
        小さく試す予算目安 {formatYen(budget)} / 週 {weeklyHours}時間 / 初売上までの目安 {months}か月
      </div>
    </div>
  </div>
);

const NumberField = ({ label, help, value, onChange }: { label: string; help?: string; value: number; onChange: (value: number) => void }) => (
  <label className="grid gap-2">
    <span className="text-sm font-semibold">{label}</span>
    {help ? <span className="text-xs text-slate-500">{help}</span> : null}
    <input type="number" min={0} className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500" value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} />
  </label>
);

const ComfortField = ({ label, low, high, value, onChange }: { label: string; low: string; high: string; value: number; onChange: (value: number) => void }) => (
  <label className="grid gap-2 rounded-2xl border border-slate-200 p-4">
    <span className="text-sm font-semibold">{label}</span>
    <input type="range" min={1} max={5} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    <span className="flex justify-between text-[11px] text-slate-500"><span>{low}</span><span>今 {value}/5</span><span>{high}</span></span>
  </label>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) => (
  <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
    <input className="size-4 accent-violet-700" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    {label}
  </label>
);

const Score = ({ label, help, value, emphasize = false }: { label: string; help: string; value: number; emphasize?: boolean }) => (
  <div className={`rounded-2xl p-4 ring-1 ${emphasize ? "bg-violet-700 text-white ring-violet-700" : "bg-slate-50 text-slate-900 ring-slate-200"}`}>
    <p className={`text-sm font-semibold ${emphasize ? "text-white" : "text-slate-800"}`}>{label}</p>
    <p className={`mt-1 text-[11px] leading-4 ${emphasize ? "text-violet-100" : "text-slate-500"}`}>{help}</p>
    <p className="mt-2 text-2xl font-semibold">{Math.round(value)}点</p>
  </div>
);

const breakdownLabels = {
  budgetFit: "予算に合う",
  timeFit: "時間に合う",
  capabilityFit: "今の得意分野に合う",
  monetizationSpeedFit: "早く売上を作りやすい",
  incomeGoalFit: "目標月収を狙いやすい",
  operatingStyleFit: "1人・在庫・顔出し条件に合う",
  riskFit: "取れるリスクに合う",
  interestFit: "興味に近い",
};

