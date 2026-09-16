"use client";

import { useMemo, useState } from "react";
import { defaultUserConstraints, marketCandidates } from "@/lib/market-opportunity/data";
import { rankMarkets } from "@/lib/market-opportunity/engine";
import type { RankedMarket, UserConstraints } from "@/lib/market-opportunity/types";
import { DetailScreen } from "@/components/market-opportunity-detail";
import { InputScreen } from "@/components/market-opportunity-input";
import { RankingScreen } from "@/components/market-opportunity-ranking";

type Screen = "input" | "ranking" | "detail";

export const MarketOpportunityApp = () => {
  const [draft, setDraft] = useState<UserConstraints>(defaultUserConstraints);
  const [submittedConstraints, setSubmittedConstraints] = useState<UserConstraints>(defaultUserConstraints);
  const [screen, setScreen] = useState<Screen>("input");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ranking = useMemo(() => rankMarkets(submittedConstraints, marketCandidates).slice(0, 10), [submittedConstraints]);
  const selectedMarket = ranking.find((item) => item.market.id === selectedId) ?? ranking[0] ?? null;

  const handleRunRanking = () => {
    setSubmittedConstraints({
      ...draft,
      excludedMarkets: normalizeCsv(draft.excludedMarkets),
      skills: normalizeCsv(draft.skills),
    });
    setSelectedId(null);
    setScreen("ranking");
  };

  const handleOpenDetail = (market: RankedMarket) => {
    setSelectedId(market.market.id);
    setScreen("detail");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {screen === "input" ? (
        <InputScreen draft={draft} onChange={setDraft} onSubmit={handleRunRanking} candidateCount={marketCandidates.length} />
      ) : null}

      {screen === "ranking" ? (
        <RankingScreen
          constraints={submittedConstraints}
          ranking={ranking}
          onBack={() => setScreen("input")}
          onSelect={handleOpenDetail}
        />
      ) : null}

      {screen === "detail" && selectedMarket ? (
        <DetailScreen
          result={selectedMarket}
          constraints={submittedConstraints}
          onBackToInput={() => setScreen("input")}
          onBackToRanking={() => setScreen("ranking")}
        />
      ) : null}
    </div>
  );
};

const normalizeCsv = (items: string[]) =>
  items
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
