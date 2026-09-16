import type { Dispatch, SetStateAction } from "react";
import type { BusinessModel, RiskTolerance, UserConstraints } from "@/lib/market-opportunity/types";
import { formatCurrency } from "@/lib/market-opportunity/engine";
import { normalizeCsvEntries } from "@/lib/market-opportunity/normalize";
import { MarketOpportunityAiTools } from "@/components/market-opportunity-ai-tools";

type InputScreenProps = {
  draft: UserConstraints;
  onChange: Dispatch<SetStateAction<UserConstraints>>;
  onSubmit: () => void;
  candidateCount: number;
};

const businessModelOptions: Array<{ value: BusinessModel | "any"; label: string }> = [
  { value: "any", label: "まだ分からない・こだわらない" },
  { value: "subscription", label: "月額課金（毎月料金をもらう）" },
  { value: "project", label: "受託（依頼を受けて仕事する）" },
  { value: "marketplace", label: "仲介（売り手と買い手をつなぐ）" },
  { value: "ecommerce", label: "ネットショップで商品を売る" },
];

const riskToleranceOptions: Array<{ value: RiskTolerance; label: string; help: string }> = [
  { value: "low", label: "低め", help: "なるべく安全に始めたい" },
  { value: "medium", label: "ふつう", help: "多少の失敗はOK" },
  { value: "high", label: "高め", help: "伸びしろ優先で挑戦したい" },
];

export const InputScreen = ({ draft, onChange, onSubmit, candidateCount }: InputScreenProps) => {
  const setField = <Key extends keyof UserConstraints>(key: Key, value: UserConstraints[Key]) => {
    onChange((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold text-sky-700">市場のチャンスを調べる</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">分かる範囲だけ入力すればOK</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          難しい言葉は必要ありません。まず小さく試す前提で、候補 {candidateCount} 件を比べます。予算や時間が少し足りなくても、すぐ「不適合」にはしません。
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <form
          className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-6">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">どんなものを探したい？</span>
              <span className="text-xs text-slate-500">普通の文章でOK。例：「1人で、10万円以内で、AIを使って始めたい」</span>
              <textarea
                className="min-h-32 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                value={draft.freeText}
                onChange={(event) => setField("freeText", event.target.value)}
              />
            </label>

            <MarketOpportunityAiTools constraints={draft} onApplyConstraints={(next) => onChange(next)} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <NumberField
                label="まず試すために使える予算"
                help="会社を本格運営する総額ではなく、最初のテストに使える金額"
                value={draft.budget}
                onChange={(value) => setField("budget", value)}
              />
              <NumberField label="何か月くらいで試したい？" help="迷ったら3か月でOK" value={draft.timeframeMonths} onChange={(value) => setField("timeframeMonths", value)} />
              <NumberField label="何人で始める？" help="1人なら1" value={draft.teamSize} onChange={(value) => setField("teamSize", value)} />
              <NumberField label="1週間に使える時間" help="だいたいでOK" value={draft.weeklyHours} onChange={(value) => setField("weeklyHours", value)} />
              <NumberField label="将来ほしい月の売上" help="最初から達成する必要はありません" value={draft.targetMonthlyRevenue} onChange={(value) => setField("targetMonthlyRevenue", value)} />

              <label className="grid gap-2">
                <span className="text-sm font-semibold">どこでやりたい？</span>
                <select className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500" value={draft.region} onChange={(event) => setField("region", event.target.value as UserConstraints["region"])}>
                  <option value="japan">日本向け</option>
                  <option value="local">自分の地域・近所</option>
                  <option value="asia">アジア向け</option>
                  <option value="global">世界向け</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">どうやってお金をもらいたい？</span>
                <select className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500" value={draft.preferredBusinessModel} onChange={(event) => setField("preferredBusinessModel", event.target.value as UserConstraints["preferredBusinessModel"])}>
                  {businessModelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">できること・経験</span>
              <span className="text-xs text-slate-500">カンマで区切る。例：AI, 営業, 動画編集。分からなければ空欄でもOK</span>
              <input type="text" className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500" value={draft.skills.join(", ")} onChange={(event) => setField("skills", normalizeCsvEntries(event.target.value))} />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">やりたくない・できないこと</span>
              <span className="text-xs text-slate-500">例：営業, 機械の知識。空欄でもOK</span>
              <input type="text" className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500" value={draft.unavailableSkills.join(", ")} onChange={(event) => setField("unavailableSkills", normalizeCsvEntries(event.target.value))} />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">候補から外したい分野</span>
              <span className="text-xs text-slate-500">例：医療, ギャンブル。空欄でもOK</span>
              <input type="text" className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500" value={draft.excludedMarkets.join(", ")} onChange={(event) => setField("excludedMarkets", normalizeCsvEntries(event.target.value))} />
            </label>

            <fieldset className="grid gap-3 rounded-2xl border border-slate-200 p-4">
              <legend className="px-2 text-sm font-semibold">どれくらい失敗リスクを取れる？</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {riskToleranceOptions.map((option) => (
                  <label key={option.value} className={`cursor-pointer rounded-2xl px-4 py-3 text-sm focus-within:ring-2 focus-within:ring-sky-500 ${draft.riskTolerance === option.value ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700"}`}>
                    <div className="flex items-center gap-2">
                      <input className="size-4 accent-sky-700" type="radio" name="riskTolerance" value={option.value} checked={draft.riskTolerance === option.value} onChange={() => setField("riskTolerance", option.value)} />
                      <span className="font-semibold">{option.label}</span>
                    </div>
                    <span className={`mt-1 block text-xs ${draft.riskTolerance === option.value ? "text-sky-100" : "text-slate-500"}`}>{option.help}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">今の条件</span>
              <div className="flex flex-wrap gap-2">
                <SummaryChip label={`お試し予算 ${formatCurrency(draft.budget)}`} />
                <SummaryChip label={`${draft.timeframeMonths}か月`} />
                <SummaryChip label={`${draft.teamSize}人`} />
                <SummaryChip label={`週${draft.weeklyHours}時間`} />
                <SummaryChip label={`目標月売上 ${formatCurrency(draft.targetMonthlyRevenue)}`} />
              </div>
            </div>

            <button type="submit" className="inline-flex items-center justify-center rounded-full bg-sky-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-800">
              この条件で候補を見る
            </button>
          </div>
        </form>

        <aside className="rounded-3xl bg-slate-900 p-8 text-slate-50 shadow-sm">
          <h2 className="text-xl font-semibold">初めてでも大丈夫</h2>
          <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-200">
            <p>予算・時間・スキルが少し足りない場合は、赤い「不適合」ではなく「ここを調整すると始めやすい」と表示します。</p>
            <p>点数は「市場の強さ」「あなたとの相性」「データの信頼度」を分けて表示します。</p>
            <p>詳しい分析は結果画面で開けます。最初は上の簡単な説明だけ見ればOKです。</p>
          </div>
        </aside>
      </section>
    </main>
  );
};

const NumberField = ({ label, help, value, onChange }: { label: string; help?: string; value: number; onChange: (value: number) => void }) => (
  <label className="grid gap-2">
    <span className="text-sm font-semibold">{label}</span>
    {help ? <span className="text-xs text-slate-500">{help}</span> : null}
    <input type="number" min={0} className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500" value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} />
  </label>
);

const SummaryChip = ({ label }: { label: string }) => <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">{label}</span>;
