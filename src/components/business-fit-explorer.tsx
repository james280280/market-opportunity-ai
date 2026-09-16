"use client";

import { useMemo, useState } from "react";
import { businessCandidates, defaultBusinessProfile } from "@/lib/business-fit/data";
import { formatYen, rankBusinesses } from "@/lib/business-fit/engine";
import type { BusinessDiscoveryMode, BusinessProfile } from "@/lib/business-fit/types";

const splitCsv = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export const BusinessFitExplorer = ({ mode }: { mode: BusinessDiscoveryMode }) => {
  const [draft, setDraft] = useState<BusinessProfile>(defaultBusinessProfile);
  const [submitted, setSubmitted] = useState<BusinessProfile>(defaultBusinessProfile);
  const [hasRun, setHasRun] = useState(false);
  const ranking = useMemo(() => rankBusinesses(submitted, businessCandidates, mode), [submitted, mode]);

  const setField = <Key extends keyof BusinessProfile>(key: Key, value: BusinessProfile[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted({ ...draft });
            setHasRun(true);
          }}
        >
          <div className="mb-6">
            <p className="text-sm font-semibold text-violet-700">あなた向け診断</p>
            <h2 className="mt-2 text-2xl font-bold">分かる範囲だけ入力</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              予算が少なくても大丈夫。いきなり本格開業する金額ではなく、まず試すための小さな予算で比較します。
            </p>
          </div>

          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">どんなことをしたい？</span>
              <span className="text-xs text-slate-500">例：「AIを使いたい」「1人でやりたい」「営業は苦手」など普通の言葉でOK</span>
              <textarea
                className="min-h-28 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
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

            <button className="rounded-full bg-violet-700 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-800" type="submit">
              {mode === "hybrid" ? "市場の強さも含めておすすめを見る" : "自分に合う順でおすすめを見る"}
            </button>
          </div>
        </form>

        <aside className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold">点数の意味</h2>
          <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-200">
            <p><span className="font-semibold text-white">あなたとの相性</span>：予算、時間、得意なこと、早く売上がほしいか、リスクなどから計算。</p>
            <p><span className="font-semibold text-white">市場の強さ</span>：その分野自体に需要や伸びしろがありそうか。今はMVP用の仮データです。</p>
            <p><span className="font-semibold text-white">総合</span>：③のモードだけで使います。市場の強さ50% + あなたとの相性50%。</p>
            <p className="rounded-2xl bg-slate-800 p-4 text-slate-300">AIが気分で順位を決めるのではなく、同じ条件なら同じ結果になる固定ルールで計算しています。</p>
          </div>
        </aside>
      </section>

      {hasRun ? (
        <section className="grid gap-4">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-violet-700">おすすめ {ranking.length}件</p>
            <h2 className="mt-2 text-2xl font-bold">{mode === "hybrid" ? "市場の強さと自分との相性を両方見た結果" : "自分に合いやすい順"}</h2>
            <p className="mt-2 text-sm text-slate-600">「向いている・向いていない」を断定せず、どこが合うか・どこを工夫すればいいかを表示します。</p>
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
                  <p className="mt-3 text-sm"><span className="font-semibold">合いやすい理由:</span> {result.topReasons.join(" / ")}</p>
                  <p className="mt-2 text-sm"><span className="font-semibold">注意点:</span> {result.business.maxRisk}</p>
                  {result.blockers.length > 0 ? (
                    <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                      <span className="font-semibold">今の条件だと難しいところ:</span> {result.blockers.join(" / ")}
                    </div>
                  ) : null}
                </div>

                <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[430px]">
                  <Score label="あなたとの相性" help="予算・時間・得意なこととの合いやすさ" value={result.personalFitScore} />
                  <Score label="市場の強さ" help="需要や伸びしろの仮スコア" value={result.marketOpportunityScore} />
                  <Score label="総合" help="市場と相性を半分ずつ" value={result.combinedScore} emphasize={mode === "hybrid"} />
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                  {Object.entries(result.breakdown).map(([key, value]) => (
                    <div key={key} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                      <p className="text-xs text-slate-500">{breakdownLabels[key as keyof typeof breakdownLabels]}</p>
                      <p className="mt-1 font-semibold">{Math.round(value)}点</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
                  <p className="text-sm font-semibold text-violet-900">最初の7日でやること</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                    {result.business.first7Days.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                  <div className="mt-3 text-xs leading-5 text-slate-600">
                    小さく試す予算目安 {formatYen(result.business.requiredBudget)} / 週 {result.business.requiredWeeklyHours}時間 / 初売上までの目安 {result.business.monthsToFirstRevenue}か月
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
};

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
