import type { Dispatch, SetStateAction } from "react";
import type { BusinessModel, RiskTolerance, UserConstraints } from "@/lib/market-opportunity/types";
import { formatCurrency } from "@/lib/market-opportunity/engine";

type InputScreenProps = {
  draft: UserConstraints;
  onChange: Dispatch<SetStateAction<UserConstraints>>;
  onSubmit: () => void;
  candidateCount: number;
};

const businessModelOptions: Array<{ value: BusinessModel | "any"; label: string }> = [
  { value: "any", label: "こだわらない" },
  { value: "subscription", label: "サブスク" },
  { value: "project", label: "受託・プロジェクト" },
  { value: "marketplace", label: "マーケットプレイス" },
  { value: "ecommerce", label: "Eコマース" },
];

const riskToleranceOptions: Array<{ value: RiskTolerance; label: string }> = [
  { value: "low", label: "低い" },
  { value: "medium", label: "中程度" },
  { value: "high", label: "高い" },
];

export const InputScreen = ({ draft, onChange, onSubmit, candidateCount }: InputScreenProps) => {
  const setField = <Key extends keyof UserConstraints>(key: Key, value: UserConstraints[Key]) => {
    onChange((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold text-sky-700">市場機会発掘AI MVP</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">条件入力</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          自然文と条件を入力すると、ダミー市場 {candidateCount} 件をルールベースで評価し、条件適合理由・不適合理由付きでランキングします。
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
              <span className="text-sm font-semibold">自然文</span>
              <textarea
                className="min-h-32 rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                value={draft.freeText}
                onChange={(event) => setField("freeText", event.target.value)}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <NumberField label="予算 (円)" value={draft.budget} onChange={(value) => setField("budget", value)} />
              <NumberField
                label="期間 (か月)"
                value={draft.timeframeMonths}
                onChange={(value) => setField("timeframeMonths", value)}
              />
              <NumberField label="人数" value={draft.teamSize} onChange={(value) => setField("teamSize", value)} />
              <NumberField
                label="目標月商 (円)"
                value={draft.targetMonthlyRevenue}
                onChange={(value) => setField("targetMonthlyRevenue", value)}
              />

              <label className="grid gap-2">
                <span className="text-sm font-semibold">地域</span>
                <select
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                  value={draft.region}
                  onChange={(event) => setField("region", event.target.value as UserConstraints["region"])}
                >
                  <option value="japan">日本</option>
                  <option value="asia">アジア</option>
                  <option value="local">ローカル</option>
                  <option value="global">グローバル</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold">希望ビジネスモデル</span>
                <select
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                  value={draft.preferredBusinessModel}
                  onChange={(event) =>
                    setField("preferredBusinessModel", event.target.value as UserConstraints["preferredBusinessModel"])
                  }
                >
                  {businessModelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">保有スキル (カンマ区切り)</span>
              <input
                className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                value={draft.skills.join(", ")}
                onChange={(event) => setField("skills", [event.target.value])}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">除外市場 (カンマ区切り)</span>
              <input
                className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
                value={draft.excludedMarkets.join(", ")}
                onChange={(event) => setField("excludedMarkets", [event.target.value])}
              />
            </label>

            <fieldset className="grid gap-3 rounded-2xl border border-slate-200 p-4">
              <legend className="px-2 text-sm font-semibold">リスク許容度</legend>
              <div className="flex flex-wrap gap-3">
                {riskToleranceOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm ${draft.riskTolerance === option.value ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700"}`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="riskTolerance"
                      checked={draft.riskTolerance === option.value}
                      onChange={() => setField("riskTolerance", option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <span>現在の入力サマリ</span>
              <div className="flex flex-wrap gap-2">
                <SummaryChip label={`予算 ${formatCurrency(draft.budget)}`} />
                <SummaryChip label={`期間 ${draft.timeframeMonths}か月`} />
                <SummaryChip label={`人数 ${draft.teamSize}人`} />
                <SummaryChip label={`月商目標 ${formatCurrency(draft.targetMonthlyRevenue)}`} />
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-sky-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              市場を評価してランキングを見る
            </button>
          </div>
        </form>

        <aside className="rounded-3xl bg-slate-900 p-8 text-slate-50 shadow-sm">
          <h2 className="text-xl font-semibold">MVPで確認できること</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-200">
            <li>・10分類 × 0〜100点の市場評価</li>
            <li>・Opportunity / Fit / Evidence 指標の分離表示</li>
            <li>・条件ベースの重み付けと足切り理由の保持</li>
            <li>・同一入力で同一順位になる決定論的ランキング</li>
          </ul>
        </aside>
      </section>
    </main>
  );
};

const NumberField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <label className="grid gap-2">
    <span className="text-sm font-semibold">{label}</span>
    <input
      type="number"
      min={0}
      className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500"
      value={value}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
    />
  </label>
);

const SummaryChip = ({ label }: { label: string }) => (
  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">{label}</span>
);
