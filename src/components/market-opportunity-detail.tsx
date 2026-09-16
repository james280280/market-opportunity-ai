import { categoryLabels, formatCurrency, formatPercent } from "@/lib/market-opportunity/engine";
import { evaluationCategories, type RankedMarket, type UserConstraints } from "@/lib/market-opportunity/types";

type DetailScreenProps = {
  result: RankedMarket;
  constraints: UserConstraints;
  onBackToRanking: () => void;
  onBackToInput: () => void;
};

export const DetailScreen = ({ result, constraints, onBackToRanking, onBackToInput }: DetailScreenProps) => (
  <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
    <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-sky-700">詳しく見る</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{result.market.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{result.market.summary}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onBackToRanking} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">ランキングへ戻る</button>
          <button type="button" onClick={onBackToInput} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">条件を変える</button>
        </div>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="市場の強さ" help="需要・成長・利益の出しやすさなど" value={formatPercent(result.opportunityScore)} />
      <MetricCard label="あなたとの相性" help="予算・時間・スキルとの合いやすさ" value={formatPercent(result.fitScore)} />
      <MetricCard label="データの信頼度" help="情報がどれくらい信用できるか" value={formatPercent(result.evidenceConfidence)} />
      <MetricCard label="データのそろい具合" help="必要な項目がどれくらい埋まっているか" value={formatPercent(result.evidenceCoverage)} />
    </section>

    <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div>
          <h2 className="text-xl font-semibold">小さく試すときの目安</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">ここに出る金額は、本格的に会社を運営する総額ではなく、需要を確かめるための小さなテスト費用の目安です。</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            <p>あなたの予算: {formatCurrency(constraints.budget)}</p>
            <p>小さく試す予算目安: {formatCurrency(result.market.budgetRequired)}</p>
            <p>人数の目安: {result.market.teamRequired}人 / 今は {constraints.teamSize}人</p>
            <p>時間の目安: 週{result.market.weeklyHoursRequired}時間 / 今は週{constraints.weeklyHours}時間</p>
            <p>期間の目安: {result.market.minimumDurationMonths}か月 / 希望 {constraints.timeframeMonths}か月</p>
          </div>

          {result.screening.warnings.length > 0 ? (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <p className="font-semibold">ここを調整すると始めやすい</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.screening.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">今の条件で大きな調整は必要ありません。</div>
          )}

          {!result.screening.passed ? (
            <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
              <p className="font-semibold">今回は候補から外す理由</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.screening.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="text-xl font-semibold">あなたとの相性の内訳</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(result.fitBreakdown).map(([key, value]) => (
              <div key={key} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-sm font-medium text-slate-600">{fitBreakdownLabels[key as keyof typeof result.fitBreakdown]}</p>
                <p className="mt-1 text-lg font-semibold">{formatPercent(value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">市場を10項目でチェック</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">まずは項目名と点数だけ見ればOK。根拠の細かい内容は、気になる項目だけ開けます。</p>
        <div className="mt-4 grid gap-3">
          {evaluationCategories.map((category) => (
            <details key={category} className="rounded-2xl border border-slate-200 p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{categoryLabels[category]}</p>
                    <p className="text-xs text-slate-500">タップすると理由を見る</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{formatPercent(result.market.categoryScores[category])}</p>
                </div>
              </summary>
              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-700 md:grid-cols-2">
                <EvidenceBlock title="分かっていること" items={result.market.categoryEvidence[category].facts} />
                <EvidenceBlock title="そこから考えられること" items={result.market.categoryEvidence[category].inferences} />
                <EvidenceBlock title="まだ仮の部分" items={result.market.categoryEvidence[category].assumptions} />
                <EvidenceBlock title="まだ調べる必要があること" items={result.market.categoryEvidence[category].missingInformation} emptyText="特になし" />
                <EvidenceBlock title="良い材料" items={result.market.categoryEvidence[category].supportingEvidence} />
                <EvidenceBlock title="悪い材料・反対材料" items={result.market.categoryEvidence[category].counterEvidence} />
                <EvidenceBlock title="情報元" items={result.market.categoryEvidence[category].sources} />
                <EvidenceBlock title="この項目の信頼度" items={[formatPercent(result.market.categoryEvidence[category].confidence)]} />
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  </main>
);

const MetricCard = ({ label, help, value }: { label: string; help: string; value: string }) => (
  <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
    <p className="text-sm font-semibold text-slate-800">{label}</p>
    <p className="mt-1 text-xs leading-5 text-slate-500">{help}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

const fitBreakdownLabels = {
  budgetFit: "予算に合っているか",
  teamFit: "人数に合っているか",
  weeklyHoursFit: "使える時間に合っているか",
  timeframeFit: "希望期間に合っているか",
  skillFit: "今のスキルに合っているか",
  regionFit: "やりたい地域に合っているか",
  businessModelFit: "希望する稼ぎ方に合っているか",
  riskFit: "取れるリスクに合っているか",
};

const EvidenceBlock = ({ title, items, emptyText = "該当なし" }: { title: string; items: string[]; emptyText?: string }) => (
  <div>
    <p className="font-semibold text-slate-900">{title}</p>
    <ul className="mt-1 list-disc space-y-1 pl-5">
      {(items.length > 0 ? items : [emptyText]).map((item) => <li key={`${title}-${item}`}>{item}</li>)}
    </ul>
  </div>
);
