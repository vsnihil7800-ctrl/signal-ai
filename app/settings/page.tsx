"use client";

import React, { useEffect, useState, Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { 
  Key, 
  Settings as SettingsIcon, 
  Sliders, 
  Save, 
  ToggleLeft, 
  ToggleRight, 
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";

export default function SettingsPage() {
  const [apiKeyFields, setApiKeyFields] = useState({
    alphaVantage: "",
    finnhub: "",
    theSportsDb: "1",
    footballData: "",
    rapidApi: "",
    fred: "",
  });

  const [limits, setLimits] = useState({
    dailyBudget: 100,
    unitSize: 10,
    lossStreakLimit: 5,
    maxOpenPositions: 10,
  });

  const [flags, setFlags] = useState({
    sportsModule: true,
    rag: false,
    portfolio: false,
    economicCalendar: true,
    experimentalModels: false,
  });

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to load settings");
      })
      .then((data) => {
        if (data.apiKeyFields) setApiKeyFields(data.apiKeyFields);
        if (data.limits) setLimits(data.limits);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const toggleShowKey = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKeyFields,
          limits,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#030712] text-slate-100">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 p-8 animate-pulse flex flex-col gap-6">
          <div className="h-10 bg-slate-800 rounded w-1/4"></div>
          <div className="h-44 bg-slate-800 rounded w-full"></div>
          <div className="h-44 bg-slate-800 rounded w-full"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-border/50 pb-4">
            <div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">Platform Configuration</h2>
              <p className="text-slate-400 text-sm mt-1">Manage API keys, toggle active modules, and adjust local risk constraints.</p>
            </div>
            {success && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-fade-in">
                <CheckCircle className="w-4 h-4" /> Config Saved
              </div>
            )}
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-6">
            {/* Panel 1: API Configuration */}
            <div className="glass rounded-2xl p-6 flex flex-col gap-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" /> Free-Tier Data API Credentials
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Provide keys for data aggregators. Limits are tracked on your dashboard panel to prevent silent rate-limit blocks.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {Object.keys(apiKeyFields).map((key) => {
                  const keyName = key as keyof typeof apiKeyFields;
                  const isVisible = showKeys[key];
                  return (
                    <div key={key} className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400 capitalize">
                        {key.replace(/([A-Z])/g, " $1")} Key
                      </label>
                      <div className="relative">
                        <input
                          type={isVisible ? "text" : "password"}
                          value={apiKeyFields[keyName]}
                          onChange={(e) =>
                            setApiKeyFields((prev) => ({
                              ...prev,
                              [keyName]: e.target.value,
                            }))
                          }
                          placeholder={`Enter ${keyName} key...`}
                          className="w-full text-sm bg-slate-950 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none px-3.5 py-2 rounded-lg font-mono text-slate-200 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(key)}
                          className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                        >
                          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel 2: Feature Flags */}
            <div className="glass rounded-2xl p-6 flex flex-col gap-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-cyan-400" /> Modular Feature Flags
              </h3>
              <p className="text-xs text-slate-400">
                Disable broken or rate-limited components instantly. Phase 1 features are enabled by default.
              </p>

              <div className="flex flex-col gap-3 mt-2">
                {Object.entries(flags).map(([flag, isEnabled]) => {
                  const flagName = flag as keyof typeof flags;
                  const isDevLocked = flag === "rag" || flag === "portfolio";
                  return (
                    <div 
                      key={flag} 
                      className={`flex justify-between items-center p-3 rounded-lg border transition-colors ${
                        isDevLocked 
                          ? "bg-slate-950/20 border-border/30 opacity-60 cursor-not-allowed" 
                          : "bg-slate-950/40 border-border/60 hover:bg-slate-950/60"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-white capitalize">
                          {flag.replace(/([A-Z])/g, " $1")}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {isDevLocked 
                            ? "Will be implemented in future release phases." 
                            : `Toggle rendering for ${flag.toLowerCase()} calendar/insights.`}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isDevLocked}
                        onClick={() =>
                          setFlags((prev) => ({
                            ...prev,
                            [flagName]: !prev[flagName],
                          }))
                        }
                        className={`transition-all duration-200 focus:outline-none ${
                          isDevLocked 
                            ? "text-slate-700" 
                            : isEnabled 
                              ? "text-primary hover:text-indigo-400" 
                              : "text-slate-600 hover:text-slate-400"
                        }`}
                      >
                        {isEnabled && !isDevLocked ? (
                          <ToggleRight className="w-10 h-10" />
                        ) : (
                          <ToggleLeft className="w-10 h-10" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel 3: Risk Parameter settings */}
            <div className="glass rounded-2xl p-6 flex flex-col gap-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" /> Platform Risk Controls
              </h3>
              <p className="text-xs text-slate-400">
                Define the pre-set unit parameters. Exceeding limits will display a warning to pause analysis.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Daily Analysis Unit Budget ($)</label>
                  <input
                    type="number"
                    value={limits.dailyBudget}
                    onChange={(e) =>
                      setLimits((prev) => ({
                        ...prev,
                        dailyBudget: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full text-sm bg-slate-950 border border-border focus:border-primary/50 outline-none px-3.5 py-2 rounded-lg text-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Reference Unit Size ($)</label>
                  <input
                    type="number"
                    value={limits.unitSize}
                    onChange={(e) =>
                      setLimits((prev) => ({
                        ...prev,
                        unitSize: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full text-sm bg-slate-950 border border-border focus:border-primary/50 outline-none px-3.5 py-2 rounded-lg text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium text-sm rounded-lg hover:bg-primary/95 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-200 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? "Saving Configuration..." : "Save Settings"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
