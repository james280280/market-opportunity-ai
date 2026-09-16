import { formatCurrency, formatPercent } from "@/lib/market-opportunity/engine";
import type { RankedMarket, UserConstraints } from "@/lib/market-opportunity/types";

type RankingScreenProps = {
  constraints: UserConstraints;
  ranking: RankedMarket[];
  onBack: () => void;
  onSelect: (market: RankedMarket) => void;
};

const businessModelLabels: Record<UserConstraints["preferredBusinessModel"], string> = {
  any: "こだわらない",
  subscription: "月額課金",
  project: "受託",
  marketplace: "仲介",
  ecommerce: "ネットショップ",
};

const riskLabels: Record<UserConstraints["riskTolerance"], string> = {
  low: "低め",
  medium: "ふつう",
  high: "高め",
};

export const RankingScreen = ({ constraints, ranking, onBack, onSelect }: RankingScreenProps) => (
  <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
    <section className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-sky-700">おすすめ順</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">今の条件で試しやすい市場</h1>
          <p className="mt-2 text-sm text-slate-600">予算や時間が少し足りない候補も、「調整ポイント」として残しています。</p>
        </div>
        <button type="button" onClick={onBack} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">条件を変える</button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <Badge label={`お試し予算 ${formatCurrency(constraints.budget)}`} />
        <Badge label={`${constraints.timeframeMonths}か月`} />
        <Badge label={`${constraints.teamSize}人`} />
        <Badge label={`週${constraints.weeklyHours}時間`} />
        <Badge label={`稼ぎ方 ${businessModelLabels[constraints.preferredBusinessModel]}`} />
        <Badge label={`リスク ${riskLabels[constraints.riskTolerance]}`} />
      </div>
    </section>

    <div className="grid gap-4">
      {ranking.map((result, index) => (
        <article key={result.market.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800">#{index + 1}</span>
                <h2 className="text-xl font-semibold">{result.market.name}</h2>
                <StatusBadge result={result} />
              </div>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">{result.market.summary}</p>
              <div className="grid gap-2 text-sm text-slate-700">
                <p><span className="font-semibold">良いところ:</span> {result.market.topReasons.slice(0, 2).join(" / ")}</p>
                <p><span className="font-semibold">気をつけること:</span> {result.market.maxRisk}</p>

                {result.screening.warnings.length > 0 ? (
                  <div className="rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
                    <p className="font-semibold">ここを調整すると始めやすい</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {result.screening.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                    </ul>
                  </div>
                ) : null}

                {!result.screening.passed ? (
                  <div className="rounded-2xl bg-rose-50 p-4 text-rose-800 ring-1 ring-rose-200">
                    <p className="font-semibold">今回は候補から外す理由</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {result.screening.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-2 lg:min-w-80">
              <MetricCard label="市場の強さ" help="需要・成長・利益の出しやすさなど" value={formatPercent(result.opportunityScore)} />
              <MetricCard label="あなたとの相性" help="予算・時間・スキルとの合いやすさ" value={formatPercent(result.fitScore)} />
              <MetricCard label="データの信頼度" help="使っている情報がどれくらい信用できるか" value={formatPercent(result.evidenceConfidence)} />
              <MetricCard label="データのそろい具合" help="必要な項目がどれくらい埋まっているか" value={formatPercent(result.evidenceCoverage)} />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => onSelect(result)} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">もっと詳しく見る</button>
          </div>
        </article>
      ))}
    </div>
  </main>
);

const MetricCard = ({ label, help, value }: { label: string; help: string; value: string }) => (
  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
    <p className="text-sm font-semibold text-slate-800">{label}</p>
    <p className="mt-1 text-xs leading-5 text-slate-500">{help}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

const Badge = ({ label }: { label: string }) => <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{label}</span>;

const StatusBadge = ({ result }: { result: RankedMarket }) => {
  if (!result.screening.passed) return <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">今回は対象外</span>;
  if (result.screening.warnings.length > 0) return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">少し調整が必要</span>;
  return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">今の条件で始めやすい</span>;
};
