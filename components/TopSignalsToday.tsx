"use client";

import React, { useEffect, useState } from "react";
import { TopSignal } from "@/app/api/signals/top/route";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ShieldAlert 
} from "lucide-react";

export function TopSignalsToday() {
  const [signals, setSignals] = useState<TopSignal[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTopSignals = async () => {
    try {
      const res = await fetch("/api/signals/top");
      if (res.ok) {
        const data = await res.json();
        setSignals(data.topSignals || []);
        setLastRefreshed(data.lastRefreshed);
      }
    } catch (err) {
      console.error("Failed to load top signals", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTopSignals();

    // Auto-refresh schedule: Periodically sync every 24 hours (86,400,000ms) or hourly check to respect API limits
    const timer = setInterval(() => {
      fetchTopSignals();
    }, 3600000); // 1 hour check

    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchTopSignals();
  };

  const getCategoryBadge = (category: TopSignal["category"]) => {
    switch (category) {
      case "India Stocks":
        return { label: "🇮🇳 India Stocks", color: "bg-orange-500/10 border-orange-500/30 text-orange-400" };
      case "US Equities":
        return { label: "🇺🇸 US Equities", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" };
      case "Cryptocurrency":
        return { label: "₿ Crypto", color: "bg-amber-500/10 border-amber-500/30 text-amber-400" };
      case "Sports Forecast":
        return { label: "⚽ Sports", color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" };
      default:
        return { label: category, color: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" };
    }
  };

  const getRiskColor = (risk: TopSignal["riskLevel"]) => {
    switch (risk) {
      case "Low":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "Medium":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "High":
        return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  if (loading) {
    return (
      <div className="w-full glass rounded-2xl p-6 border border-indigo-500/20 shadow-xl animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-slate-900/60 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full glass rounded-3xl p-6 border border-indigo-500/25 shadow-2xl relative overflow-hidden bg-gradient-to-br from-indigo-950/30 via-slate-950/80 to-purple-950/30 backdrop-blur-md">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Top Signals Today
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Live Scan
              </span>
            </h3>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Automatically aggregated highest-confidence picks across Global Markets, Crypto, and Sports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Informational Disclaimer Badge */}
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full text-[11px] font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Informational only — Not financial advice
          </span>

          {/* Refresh Action */}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-border/60 rounded-xl text-xs text-slate-300 transition-all font-mono"
            title="Refreshes signals respecting API rate limits"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Scanning..." : "Refresh Signals"}
          </button>
        </div>
      </div>

      {/* Signals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {signals.map((sig) => {
          const cat = getCategoryBadge(sig.category);
          const isPositive = sig.recommendation.toLowerCase().includes("bullish") || sig.recommendation.toLowerCase().includes("win");
          const isNegative = sig.recommendation.toLowerCase().includes("bearish");
          const confidencePercent = Math.round(sig.confidence * 100);

          return (
            <div
              key={sig.id}
              className="bg-slate-900/60 hover:bg-slate-900/90 border border-border/50 hover:border-indigo-500/40 p-4 rounded-2xl flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10 group"
            >
              <div>
                {/* Category & Symbol Header */}
                <div className="flex justify-between items-center mb-2.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.color}`}>
                    {cat.label}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${getRiskColor(sig.riskLevel)}`}>
                    {sig.riskLevel} Risk
                  </span>
                </div>

                {/* Asset Title & Ticker */}
                <div className="flex justify-between items-baseline mb-3">
                  <h4 className="font-bold text-white text-base truncate max-w-[170px]" title={sig.asset}>
                    {sig.asset}
                  </h4>
                  <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
                    {sig.symbol}
                  </span>
                </div>

                {/* Recommendation & Confidence Badge */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-border/40 mb-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono uppercase text-slate-400">AI Signal</span>
                    <div className="flex items-center gap-1">
                      {isPositive ? (
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-emerald-400">
                          <TrendingUp className="w-3.5 h-3.5" /> {sig.recommendation}
                        </span>
                      ) : isNegative ? (
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-rose-400">
                          <TrendingDown className="w-3.5 h-3.5" /> {sig.recommendation}
                        </span>
                      ) : (
                        <span className="font-bold text-xs text-amber-400">
                          {sig.recommendation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="w-full">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
                      <span>Model Confidence</span>
                      <span className="font-bold text-indigo-400">{confidencePercent}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-border/40">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${confidencePercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Reasoning Box */}
                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/30 p-2.5 rounded-xl border border-border/30 line-clamp-3 group-hover:line-clamp-none transition-all">
                  {sig.reasoning}
                </p>
              </div>

              {/* Footer Timestamp */}
              <div className="mt-3 pt-2 border-t border-border/30 flex justify-between items-center text-[9px] text-slate-500 font-mono">
                <span>Signal Verified</span>
                <span>{lastRefreshed ? new Date(lastRefreshed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
