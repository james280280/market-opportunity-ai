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
            <p className="text-sm font-semibold text-violet-700">Business Fit モード</p>
            <h2 className="mt-2 text-2xl font-bold">あなたの条件を入力</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              市場の強さと、あなた自身の資金・時間・スキル・運営スタイルを分けて評価します。
            </p>
          </div>

          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">やりたいこと・条件</span>
              <textarea
                className="min-h-28 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                value={draft.freeText}
                onChange={(event) => setField("freeText", event.target.value)}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <NumberField label="初期予算 (円)" value={draft.startingBudget} onChange={(value) => setField("startingBudget", value)} />
              <NumberField label="週に使える時間" value={draft.weeklyHours} onChange={(value) => setField("weeklyHours", value)} />
              <NumberField label="目標月収 (円)" value={draft.targetMonthlyIncome} onChange={(value) => setField("targetMonthlyIncome", value)} />
              <NumberField label="何か月以内に初収益がほしい？" value={draft.timeToFirstRevenueMonths} onChange={(value) => setField("timeToFirstRevenueMonths", value)} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ComfortField label="営業の得意度" value={draft.salesComfort} onChange={(value) => setField("salesComfort", value)} />
              <ComfortField label="PC・開発の得意度" value={draft.technicalComfort} onChange={(value) => setField("technicalComfort", value)} />
              <ComfortField label="AI活用の得意度" value={draft.aiComfort} onChange={(value) => setField("aiComfort", value)} />
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">興味のある分野（カンマ区切り）</span>
              <input
                className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                value={draft.interests.join(", ")}
                onChange={(event) => setField("interests", splitCsv(event.target.value))}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">避けたいこと（カンマ区切り）</span>
              <input
                className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                placeholder="例: 営業, 店舗, 広告"
                value={draft.avoid.join(", ")}
                onChange={(event) => setField("avoid", splitCsv(event.target.value))}
              />
            </label>

            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
              <Toggle label="基本1人でやりたい" checked={draft.solo} onChange={(value) => setField("solo", value)} />
              <Toggle label="在庫を持ってもOK" checked={draft.inventoryOkay} onChange={(value) => setField("inventoryOkay", value)} />
              <Toggle label="顔出しOK" checked={draft.faceOnCameraOkay} onChange={(value) => setField("faceOnCameraOkay", value)} />
              <Toggle label="地域密着の仕事もOK" checked={draft.localServiceOkay} onChange={(value) => setField("localServiceOkay", value)} />
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">リスク許容度</span>
              <select
                className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                value={draft.riskTolerance}
                onChange={(event) => setField("riskTolerance", event.target.value as BusinessProfile["riskTolerance"])}
              >
                <option value="low">低い</option>
                <option value="medium">中程度</option>
                <option value="high">高い</option>
              </select>
            </label>

            <button className="rounded-full bg-violet-700 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-800" type="submit">
              {mode === "hybrid" ? "市場 × 自分の相性でランキング" : "自分に合うビジネスをランキング"}
            </button>
          </div>
        </form>

        <aside className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold">このモードの考え方</h2>
          <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-200">
            <p><span className="font-semibold text-white">Personal Fit</span>：予算15%・時間15%・スキル20%・収益化速度10%・目標月収10%・運営条件10%・リスク10%・興味10%。</p>
            <p><span className="font-semibold text-white">Market Opportunity</span>：現時点はMVP用の基準値。ライブ市場調査ではありません。</p>
            <p><span className="font-semibold text-white">両方から探す</span>：Personal Fit 50% + Market Opportunity 50%で並べ替えます。</p>
            <p className="rounded-2xl bg-slate-800 p-4 text-slate-300">最終順位はAIではなく固定ルールで計算します。同じ入力と候補データなら同じ順位になります。</p>
          </div>
        </aside>
      </section>

      {hasRun ? (
        <section className="grid gap-4">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-violet-700">TOP {ranking.length}</p>
            <h2 className="mt-2 text-2xl font-bold">{mode === "hybrid" ? "市場性とあなたの適合度を両方見たランキング" : "あなたとの適合度ランキング"}</h2>
            <p className="mt-2 text-sm text-slate-600">市場スコアと個人適合スコアは別表示のまま残しています。</p>
          </div>

          {ranking.map((result, index) => (
            <article key={result.business.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-800">#{index + 1}</span>
                    <h3 className="text-xl font-semibold">{result.business.name}</h3>
                    {result.blocked ? <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">条件不適合あり</span> : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{result.business.summary}</p>
                  <p className="mt-3 text-sm"><span className="font-semibold">合う理由:</span> {result.topReasons.join(" / ")}</p>
                  <p className="mt-2 text-sm"><span className="font-semibold">最大リスク:</span> {result.business.maxRisk}</p>
                  {result.blockers.length > 0 ? <p className="mt-2 text-sm text-rose-700"><span className="font-semibold">不適合理由:</span> {result.blockers.join(" / ")}</p> : null}
                </div>

                <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[430px]">
                  <Score label="Personal Fit" value={result.personalFitScore} />
                  <Score label="Market Opportunity" value={result.marketOpportunityScore} />
                  <Score label="Combined" value={result.combinedScore} emphasize={mode === "hybrid"} />
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
                  <p className="text-sm font-semibold text-violet-900">最初の7日</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                    {result.business.first7Days.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                  <div className="mt-3 text-xs text-slate-600">
                    初期費用目安 {formatYen(result.business.requiredBudget)} / 週 {result.business.requiredWeeklyHours}時間 / 初収益目安 {result.business.monthsToFirstRevenue}か月
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

const NumberField = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
  <label className="grid gap-2">
    <span className="text-sm font-semibold">{label}</span>
    <input type="number" min={0} className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500" value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} />
  </label>
);

const ComfortField = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
  <label className="grid gap-2 rounded-2xl border border-slate-200 p-4">
    <span className="text-sm font-semibold">{label}: {value}/5</span>
    <input type="range" min={1} max={5} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) => (
  <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
    <input className="size-4 accent-violet-700" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    {label}
  </label>
);

const Score = ({ label, value, emphasize = false }: { label: string; value: number; emphasize?: boolean }) => (
  <div className={`rounded-2xl p-4 ring-1 ${emphasize ? "bg-violet-700 text-white ring-violet-700" : "bg-slate-50 text-slate-900 ring-slate-200"}`}>
    <p className={`text-xs font-medium ${emphasize ? "text-violet-100" : "text-slate-500"}`}>{label}</p>
    <p className="mt-1 text-2xl font-semibold">{Math.round(value)}点</p>
  </div>
);

const breakdownLabels = {
  budgetFit: "予算",
  timeFit: "時間",
  capabilityFit: "スキル",
  monetizationSpeedFit: "収益化速度",
  incomeGoalFit: "目標月収",
  operatingStyleFit: "運営条件",
  riskFit: "リスク",
  interestFit: "興味",
};
