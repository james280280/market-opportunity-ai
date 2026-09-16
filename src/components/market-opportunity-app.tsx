"use client";

import { useMemo, useState } from "react";
import { defaultUserConstraints, marketCandidates } from "@/lib/market-opportunity/data";
import { rankMarkets } from "@/lib/market-opportunity/engine";
import type { RankedMarket, UserConstraints } from "@/lib/market-opportunity/types";
import { BusinessFitExplorer } from "@/components/business-fit-explorer";
import { DetailScreen } from "@/components/market-opportunity-detail";
import { InputScreen } from "@/components/market-opportunity-input";
import { RankingScreen } from "@/components/market-opportunity-ranking";

type Screen = "input" | "ranking" | "detail";
type AppMode = "market" | "personal" | "hybrid";

export const MarketOpportunityApp = () => {
  const [mode, setMode] = useState<AppMode>("personal");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <ModeSelector mode={mode} onChange={setMode} />
      {mode === "market" ? <MarketDiscoveryWorkflow /> : <BusinessFitExplorer mode={mode} />}
    </div>
  );
};

const ModeSelector = ({ mode, onChange }: { mode: AppMode; onChange: (mode: AppMode) => void }) => {
  const options: Array<{ id: AppMode; title: string; description: string; recommended?: boolean }> = [
    { id: "personal", title: "① 自分に合うビジネスを探す", description: "予算・時間・得意なことから、始めやすい順に表示", recommended: true },
    { id: "market", title: "② 市場のチャンスを調べる", description: "どんな分野に需要や伸びしろがあるかを詳しく見る" },
    { id: "hybrid", title: "③ 両方から探す", description: "市場の強さと、自分との相性を半分ずつ見て比較" },
  ];

  return (
    <header className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-sky-300">ビジネス候補を探す</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">難しい知識なしで、何を始めるか考える</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          初めての人は①がおすすめ。分からない項目は空欄や初期値のままでも使えます。
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`relative rounded-2xl border p-4 text-left transition ${
                mode === option.id
                  ? "border-white bg-white text-slate-950"
                  : "border-slate-600 bg-slate-900/40 text-white hover:border-slate-400"
              }`}
            >
              {option.recommended ? <span className="absolute right-3 top-3 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">初心者おすすめ</span> : null}
              <span className="block pr-20 font-semibold">{option.title}</span>
              <span className={`mt-1 block text-xs leading-5 ${mode === option.id ? "text-slate-600" : "text-slate-300"}`}>{option.description}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

const MarketDiscoveryWorkflow = () => {
  const [draft, setDraft] = useState<UserConstraints>(defaultUserConstraints);
  const [submittedConstraints, setSubmittedConstraints] = useState<UserConstraints>(defaultUserConstraints);
  const [screen, setScreen] = useState<Screen>("input");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ranking = useMemo(() => rankMarkets(submittedConstraints, marketCandidates).slice(0, 10), [submittedConstraints]);
  const selectedMarket = ranking.find((item) => item.market.id === selectedId) ?? ranking[0] ?? null;

  const handleRunRanking = () => {
    setSubmittedConstraints({ ...draft });
    setSelectedId(null);
    setScreen("ranking");
  };

  const handleOpenDetail = (market: RankedMarket) => {
    setSelectedId(market.market.id);
    setScreen("detail");
  };

  return (
    <>
      {screen === "input" ? <InputScreen draft={draft} onChange={setDraft} onSubmit={handleRunRanking} candidateCount={marketCandidates.length} /> : null}
      {screen === "ranking" ? <RankingScreen constraints={submittedConstraints} ranking={ranking} onBack={() => setScreen("input")} onSelect={handleOpenDetail} /> : null}
      {screen === "detail" && selectedMarket ? <DetailScreen result={selectedMarket} constraints={submittedConstraints} onBackToInput={() => setScreen("input")} onBackToRanking={() => setScreen("ranking")} /> : null}
    </>
  );
};
