"use client";

import { BusinessFitExplorer } from "@/components/business-fit-explorer";

export const MarketOpportunityApp = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-sky-300">AI事業選定ツール</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">自分に合っていて、市場にもチャンスがある事業を探す</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          100候補を分割生成し、条件で絞り込み、Webで2段階調査して上位候補を比較します。
        </p>
      </div>
    </header>
    <BusinessFitExplorer />
  </div>
);
