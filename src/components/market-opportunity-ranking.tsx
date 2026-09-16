import { formatCurrency, formatPercent } from "@/lib/market-opportunity/engine";
import type { RankedMarket, UserConstraints } from "@/lib/market-opportunity/types";

type RankingScreenProps = {
  constraints: UserConstraints;
  ranking: RankedMarket[];
  onBack: () => void;
  onSelect: (market: RankedMarket) => void;
};

export const RankingScreen = ({ constraints, ranking, onBack, onSelect }: RankingScreenProps) => {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-700">TOP 10 ランキング</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">条件に合う市場候補を順位付け</h1>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            条件入力へ戻る
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          <Badge label={`予算 ${formatCurrency(constraints.budget)}`} />
          <Badge label={`期間 ${constraints.timeframeMonths}か月`} />
          <Badge label={`人数 ${constraints.teamSize}人`} />
          <Badge label={`希望モデル ${constraints.preferredBusinessModel}`} />
          <Badge label={`リスク許容度 ${constraints.riskTolerance}`} />
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
                  <StatusBadge passed={result.screening.passed} />
                </div>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">{result.market.summary}</p>
                <div className="grid gap-2 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">上位理由:</span> {result.market.topReasons.slice(0, 2).join(" / ")}
                  </p>
                  <p>
                    <span className="font-semibold">最大リスク:</span> {result.market.maxRisk}
                  </p>
                  {!result.screening.passed ? (
                    <p className="text-rose-700">
                      <span className="font-semibold">条件不適合理由:</span> {result.screening.reasons.join(" / ")}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid min-w-full gap-3 sm:grid-cols-2 lg:min-w-80">
                <MetricCard label="Opportunity Score" value={formatPercent(result.opportunityScore)} />
                <MetricCard label="Fit Score" value={formatPercent(result.fitScore)} />
                <MetricCard label="Evidence Confidence" value={formatPercent(result.evidenceConfidence)} />
                <MetricCard label="Evidence Coverage" value={formatPercent(result.evidenceCoverage)} />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => onSelect(result)}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                市場詳細を見る
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

const Badge = ({ label }: { label: string }) => (
  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{label}</span>
);

const StatusBadge = ({ passed }: { passed: boolean }) => (
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold ${passed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}
  >
    {passed ? "条件適合" : "条件不適合"}
  </span>
);
