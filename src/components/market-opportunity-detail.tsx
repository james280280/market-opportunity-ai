import { categoryLabels, formatCurrency, formatPercent } from "@/lib/market-opportunity/engine";
import { evaluationCategories, type RankedMarket, type UserConstraints } from "@/lib/market-opportunity/types";

type DetailScreenProps = {
  result: RankedMarket;
  constraints: UserConstraints;
  onBackToRanking: () => void;
  onBackToInput: () => void;
};

export const DetailScreen = ({ result, constraints, onBackToRanking, onBackToInput }: DetailScreenProps) => {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-700">市場詳細</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{result.market.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{result.market.summary}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBackToRanking}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ランキングへ戻る
            </button>
            <button
              type="button"
              onClick={onBackToInput}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              条件入力へ戻る
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Opportunity Score" value={formatPercent(result.opportunityScore)} />
        <MetricCard label="Fit Score" value={formatPercent(result.fitScore)} />
        <MetricCard label="Evidence Confidence" value={formatPercent(result.evidenceConfidence)} />
        <MetricCard label="Evidence Coverage" value={formatPercent(result.evidenceCoverage)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div>
            <h2 className="text-xl font-semibold">条件適合・足切り</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p>予算上限: {formatCurrency(constraints.budget)}</p>
              <p>必要予算: {formatCurrency(result.market.budgetRequired)}</p>
              <p>必要人数: {result.market.teamRequired}人 / 上限 {constraints.teamSize}人</p>
              <p>必要期間: {result.market.minimumDurationMonths}か月 / 上限 {constraints.timeframeMonths}か月</p>
            </div>
            <div className="mt-4 rounded-2xl p-4 text-sm ring-1 ring-slate-200">
              {result.screening.passed ? (
                <p className="font-semibold text-emerald-700">足切り条件はすべてクリアしています。</p>
              ) : (
                <div className="space-y-2 text-rose-700">
                  <p className="font-semibold">条件不適合理由</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {result.screening.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Fit breakdown</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(result.fitBreakdown).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-medium tracking-wide text-slate-500">{fitBreakdownLabels[key as keyof typeof result.fitBreakdown]}</p>
                  <p className="mt-1 text-lg font-semibold">{formatPercent(value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div>
            <h2 className="text-xl font-semibold">10大評価分類</h2>
            <div className="mt-4 grid gap-3">
              {evaluationCategories.map((category) => (
                <div key={category} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{categoryLabels[category]}</p>
                      <p className="text-sm text-slate-500">重み {Math.round(result.categoryWeights[category] * 100)}%</p>
                    </div>
                    <p className="text-xl font-bold text-slate-900">{formatPercent(result.market.categoryScores[category])}</p>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
                    <EvidenceBlock title="事実" items={result.market.categoryEvidence[category].facts} />
                    <EvidenceBlock title="推論" items={result.market.categoryEvidence[category].inferences} />
                    <EvidenceBlock title="仮定" items={result.market.categoryEvidence[category].assumptions} />
                    <EvidenceBlock title="不足情報" items={result.market.categoryEvidence[category].missingInformation} emptyText="不足情報なし" />
                    <EvidenceBlock title="支持根拠" items={result.market.categoryEvidence[category].supportingEvidence} />
                    <EvidenceBlock title="反証根拠" items={result.market.categoryEvidence[category].counterEvidence} />
                    <EvidenceBlock title="情報源" items={result.market.categoryEvidence[category].sources} />
                    <EvidenceBlock
                      title="信頼度"
                      items={[`${formatPercent(result.market.categoryEvidence[category].confidence)}`]}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

const fitBreakdownLabels = {
  budgetFit: "予算適合",
  teamFit: "人数適合",
  timeframeFit: "期間適合",
  skillFit: "スキル適合",
  regionFit: "地域適合",
  businessModelFit: "ビジネスモデル適合",
  riskFit: "リスク適合",
};

const EvidenceBlock = ({
  title,
  items,
  emptyText = "該当なし",
}: {
  title: string;
  items: string[];
  emptyText?: string;
}) => (
  <div>
    <p className="font-semibold text-slate-900">{title}</p>
    <ul className="mt-1 list-disc space-y-1 pl-5">
      {(items.length > 0 ? items : [emptyText]).map((item) => (
        <li key={`${title}-${item}`}>{item}</li>
      ))}
    </ul>
  </div>
);
