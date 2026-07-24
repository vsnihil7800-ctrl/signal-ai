"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopSignalsToday } from "@/components/TopSignalsToday";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  ScatterChart,
  Scatter 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Cpu, 
  BarChart3,
  MessageSquare,
  Send,
  Plus,
  Trash2
} from "lucide-react";
import { BacktestResult } from "@/modules/stocks/backtester";
import { AssetWeight, FrontierPoint, PortfolioOptimizationResult } from "@/modules/portfolio/optimizer";
import { RagSource } from "@/modules/ai/rag";

// Types matching database schema returned by API
interface Stock {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  syncError?: string | null;
  exchange?: string;
}

interface Signal {
  id: string;
  ticker: string;
  recommendation: string;
  confidence: number;
  riskLevel: string;
  technicalScore: number;
  sentimentScore: number;
  fundamentalScore: number;
  macroScore: number;
  volatilityScore: number;
  reasoning: string;
}

interface Prediction {
  id: string;
  predictedWinner: string;
  homeProb: number;
  awayProb: number;
  drawProb: number;
  confidence: number;
  riskLevel: string;
  precision: number;
  recall: number;
  f1Score: number;
  calibrationScore: number;
  numSamples: number;
  trainingWindow: string;
  reason: string;
  outcomeMatched: boolean | null;
}

interface SavedPortfolio {
  id: string;
  name: string;
  userId: string;
  assets: string;
  allocation: number;
  sharpeRatio: number;
  volatility: number;
  expectedReturn: number;
  riskScore: number;
  createdAt: string;
}

interface ChatSession {
  id: string;
  sessionName: string;
  createdAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  confidence?: number;
  sources?: RagSource[];
  createdAt: string;
}

interface USStock {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  syncError?: string | null;
}

interface USStockSignal {
  id: string;
  ticker: string;
  recommendation: string;
  confidence: number;
  riskLevel: string;
  technicalScore: number;
  sentimentScore: number;
  fundamentalScore: number;
  macroScore: number;
  volatilityScore: number;
  reasoning: string;
}


interface GlobalIndex {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  rank: number;
}

interface CryptoSignal {
  id: string;
  symbol: string;
  recommendation: string;
  confidence: number;
  riskLevel: string;
  technicalScore: number;
  sentimentScore: number;
  onChainScore: number;
  volumeScore: number;
  volatilityScore: number;
  reasoning: string;
}


interface CryptoHolding {
  symbol: string;
  name: string;
  amount: number;
  averageCost: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
  weight: number;
}

interface CryptoPortfolioSummary {
  holdings: CryptoHolding[];
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  portfolioRiskScore: number;
  correlationMatrix: Record<string, Record<string, number>>;
}


interface DetailData {
  ticker: string;
  fundamentals: {
    peRatio: number | null;
    pbRatio: number | null;
    eps: number | null;
    revenueGrowth: number | null;
    netProfitGrowth: number | null;
    debtRatio: number | null;
    cashFlow: number | null;
    roe: number | null;
    roce: number | null;
  };
  candles: Array<{
    date: string;
    close: number;
    bbUpper: number | null;
    bbMiddle: number | null;
    bbLower: number | null;
    rsi14: number | null;
    macdLine: number | null;
    macdSignal: number | null;
  }>;
  latestIndicators: {
    rsi: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHist: number | null;
    bbUpper: number | null;
    bbLower: number | null;
    atr: number | null;
    obv: number | null;
    stochK: number | null;
    stochD: number | null;
    vwap: number | null;
    isVolumeSpike: boolean;
  };
  rateLimitHit?: boolean;
}

interface SportsFixture {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  eventDate: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  predictions: Prediction[];
}

interface EconomicEvent {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  country: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  impact: string;
  affectedSectors: string;
}


// Simulated price chart data for MSFT and AAPL
const chartData = [
  { name: "Mon", AAPL: 185.2, MSFT: 415.5 },
  { name: "Tue", AAPL: 186.8, MSFT: 418.1 },
  { name: "Wed", AAPL: 188.1, MSFT: 417.0 },
  { name: "Thu", AAPL: 187.9, MSFT: 420.2 },
  { name: "Fri", AAPL: 189.8, MSFT: 421.9 },
];

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "india";
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [fixtures, setFixtures] = useState<SportsFixture[]>([]);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"chart" | "indicators" | "fundamentals">("chart");
  const [selectedOverlay, setSelectedOverlay] = useState<"none" | "bb" | "rsi" | "macd">("none");

  // Portfolio Optimizer form state
  const [portfolioName, setPortfolioName] = useState("My Active Strategy");
  const [portfolioCapital, setPortfolioCapital] = useState(10000);
  const [portfolioWeights, setPortfolioWeights] = useState<Record<string, number>>({});
  const [savedPortfolios, setSavedPortfolios] = useState<SavedPortfolio[]>([]);
  const [activePortfolioStats, setActivePortfolioStats] = useState<PortfolioOptimizationResult | null>(null);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  // RAG Chat form state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  // Backtest form state
  const [backtestTicker, setBacktestTicker] = useState("AAPL");
  const [backtestStrategy, setBacktestStrategy] = useState<"rsi" | "macd" | "sma_cross">("rsi");
  const [backtestCapital, setBacktestCapital] = useState(10000);
  const [backtestStart, setBacktestStart] = useState("2024-01-01");
  const [backtestEnd, setBacktestEnd] = useState("2026-01-01");
  const [runningBacktest, setRunningBacktest] = useState(false);
  const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null);
  const [predictingFixtureId, setPredictingFixtureId] = useState<string | null>(null);

  // US Stocks state
  const [usStocks, setUsStocks] = useState<USStock[]>([]);
  const [usSignals, setUsSignals] = useState<USStockSignal[]>([]);
  const [syncingUS, setSyncingUS] = useState(false);

  // Crypto state
  const [cryptoAssets, setCryptoAssets] = useState<CryptoAsset[]>([]);
  const [cryptoSignals, setCryptoSignals] = useState<CryptoSignal[]>([]);
  const [cryptoPortfolio, setCryptoPortfolio] = useState<CryptoPortfolioSummary | null>(null);
  const [syncingCrypto, setSyncingCrypto] = useState(false);

  // Indices state
  const [indices, setIndices] = useState<GlobalIndex[]>([]);

  // Crypto transaction input form state
  const [txSymbol, setTxSymbol] = useState("BTC");
  const [txAmount, setTxAmount] = useState(0.1);
  const [txPrice, setTxPrice] = useState(64000);
  const [txType, setTxType] = useState<"BUY" | "SELL">("BUY");
  const [loadingTx, setLoadingTx] = useState(false);
  const [manageTickersOpen, setManageTickersOpen] = useState(false);
  const [newTickerInput, setNewTickerInput] = useState("");
  const [newTickerName, setNewTickerName] = useState("");
  const [addingTicker, setAddingTicker] = useState(false);

  // Settings State variables
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

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSaveSettingsSuccess(false);
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
        setSaveSettingsSuccess(true);
        alert("Configuration saved successfully!");
        setTimeout(() => setSaveSettingsSuccess(false), 3000);
      } else {
        alert("Failed to save configuration.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving configuration.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Alerts Control State
  interface PriceAlert {
    id: string;
    symbol: string;
    type: string;
    target: number;
    triggered: boolean;
    createdAt: string;
  }

  const [alertsList, setAlertsList] = useState<PriceAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertSymbol, setAlertSymbol] = useState("BTC");
  const [alertType, setAlertType] = useState<"PRICE_ABOVE" | "PRICE_BELOW">("PRICE_ABOVE");
  const [alertTarget, setAlertTarget] = useState<number>(65000);
  const [creatingAlert, setCreatingAlert] = useState(false);

  const fetchAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const res = await fetch("/api/crypto/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlertsList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to fetch alerts", e);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertSymbol.trim() || !alertTarget) return;
    setCreatingAlert(true);
    try {
      const res = await fetch("/api/crypto/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: alertSymbol.trim(),
          type: alertType,
          target: alertTarget,
        }),
      });
      if (res.ok) {
        setShowAlertForm(false);
        setAlertSymbol("BTC");
        setAlertTarget(65000);
        await fetchAlerts();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create alert");
      }
    } catch (e) {
      console.error(e);
      alert("Error creating alert");
    } finally {
      setCreatingAlert(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    if (!confirm("Are you sure you want to delete this alert trigger?")) return;
    try {
      const res = await fetch(`/api/crypto/alerts?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAlerts();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete alert");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting alert");
    }
  };

  const handleAddTicker = async () => {
    if (!newTickerInput.trim()) return;
    setAddingTicker(true);
    try {
      let endpoint = "/api/stocks";
      let payload: Record<string, string> = { ticker: newTickerInput.trim(), name: newTickerName.trim() };

      if (currentTab === "us") {
        endpoint = "/api/us-stocks";
        payload = { action: "addTicker", ticker: newTickerInput.trim(), name: newTickerName.trim() };
      } else if (currentTab === "crypto") {
        endpoint = "/api/crypto";
        payload = { action: "addTicker", symbol: newTickerInput.trim() };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setNewTickerInput("");
        setNewTickerName("");
        await refetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to add ticker");
      }
    } catch (e) {
      console.error(e);
      alert("Error adding ticker");
    } finally {
      setAddingTicker(false);
    }
  };

  const handleDeleteTicker = async (ticker: string) => {
    if (!confirm(`Are you sure you want to remove ${ticker} from the watchlist?`)) return;
    try {
      let endpoint = `/api/stocks?ticker=${ticker}`;
      if (currentTab === "us") {
        endpoint = `/api/us-stocks?ticker=${ticker}`;
      } else if (currentTab === "crypto") {
        endpoint = `/api/crypto?ticker=${ticker}`;
      }

      const res = await fetch(endpoint, {
        method: "DELETE",
      });
      if (res.ok) {
        await refetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to delete ticker");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting ticker");
    }
  };

  const handleRunBacktest = async () => {
    setRunningBacktest(true);
    setBacktestResults(null);
    try {
      const isCrypto = cryptoAssets.some(a => a.symbol === backtestTicker);
      const endpoint = isCrypto ? "/api/crypto/backtest" : "/api/stocks/backtest";
      const payload = isCrypto ? {
        symbol: backtestTicker,
        strategy: backtestStrategy,
        initialCapital: backtestCapital,
      } : {
        ticker: backtestTicker,
        strategy: backtestStrategy,
        initialCapital: backtestCapital,
        startDate: backtestStart,
        endDate: backtestEnd,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setBacktestResults(isCrypto ? data.result : data);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to run backtest");
      }
    } catch (e) {
      console.error(e);
      alert("Error executing backtest simulation");
    } finally {
      setRunningBacktest(false);
    }
  };

  const handleSelectStock = async (ticker: string) => {
    setSelectedTicker(ticker);
    setLoadingDetail(true);
    setDetailData(null);
    setActiveTab("chart");
    setSelectedOverlay("none");
    try {
      const res = await fetch(`/api/stocks/details?ticker=${ticker}`);
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePredictSports = async (fixtureId: string) => {
    setPredictingFixtureId(fixtureId);
    try {
      const res = await fetch("/api/sports/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureId }),
      });
      if (res.ok) {
        await refetchData();
      } else {
        alert("Failed to calculate sports prediction.");
      }
    } catch (e) {
      console.error(e);
      alert("Error executing sports model prediction.");
    } finally {
      setPredictingFixtureId(null);
    }
  };

  const refetchData = async () => {
    try {
      const [stocksRes, sportsRes, calendarRes, portfolioRes, chatRes, usStocksRes, cryptoRes, cryptoPortfolioRes, indicesRes] = await Promise.all([
        fetch("/api/stocks").then((r) => r.json()),
        fetch("/api/sports").then((r) => r.json()),
        fetch("/api/calendar").then((r) => r.json()),
        fetch("/api/portfolio").then((r) => r.json()),
        fetch("/api/chat").then((r) => r.json()),
        fetch("/api/us-stocks").then((r) => r.json()),
        fetch("/api/crypto").then((r) => r.json()),
        fetch("/api/crypto/portfolio").then((r) => r.json()),
        fetch("/api/indices").then((r) => r.json()),
      ]);

      if (stocksRes.stocks) setStocks(stocksRes.stocks);
      if (stocksRes.signals) setSignals(stocksRes.signals);
      setFixtures(sportsRes || []);
      setEvents(calendarRes || []);
      setSavedPortfolios(portfolioRes || []);
      setChatSessions(chatRes || []);

      if (usStocksRes.stocks) setUsStocks(usStocksRes.stocks);
      if (usStocksRes.signals) setUsSignals(usStocksRes.signals);

      if (cryptoRes.assets) setCryptoAssets(cryptoRes.assets);
      if (cryptoRes.signals) setCryptoSignals(cryptoRes.signals);
      if (cryptoPortfolioRes.summary) setCryptoPortfolio(cryptoPortfolioRes.summary);

      if (indicesRes) setIndices(indicesRes);
    } catch (err) {
      console.error("Failed to refetch dashboard data", err);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/stocks/analyze", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        await refetchData();
        if (data.rateLimitHit) {
          alert("Alpha Vantage API rate limit reached! Displaying simulated news sentiment and technical ratings.");
        } else {
          alert("Market analysis completed successfully! Fresh sentiments and AI signals generated.");
        }
      } else {
        alert("Failed to run market analysis.");
      }
    } catch (e) {
      console.error(e);
      alert("Error triggering analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOptimizePortfolio = async () => {
    setLoadingPortfolio(true);
    try {
      const allocations = Object.entries(portfolioWeights).map(([ticker, w]) => ({
        ticker,
        weight: w,
      }));

      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: portfolioName,
          allocation: portfolioCapital,
          allocations,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setActivePortfolioStats(result.stats);
        setActivePortfolioId(result.portfolio.id);
        await refetchData();
        alert("Portfolio allocations optimized and saved successfully!");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to optimize portfolio");
      }
    } catch (e) {
      console.error(e);
      alert("Error optimizing portfolio");
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm("Are you sure you want to delete this portfolio?")) return;
    try {
      const res = await fetch(`/api/portfolio?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await refetchData();
        if (activePortfolioId === id) {
          setActivePortfolioStats(null);
          setActivePortfolioId(null);
        }
      } else {
        alert("Failed to delete portfolio");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadPortfolio = async (p: SavedPortfolio) => {
    setPortfolioName(p.name);
    setPortfolioCapital(p.allocation);
    try {
      const parsed = JSON.parse(p.assets) as AssetWeight[];
      const weightsObj: Record<string, number> = {};
      parsed.forEach((a: AssetWeight) => {
        weightsObj[a.ticker] = Math.round(a.weight * 100);
      });
      setPortfolioWeights(weightsObj);
      
      setLoadingPortfolio(true);
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p.name,
          allocation: p.allocation,
          allocations: parsed.map((a: AssetWeight) => ({ ticker: a.ticker, weight: a.weight })),
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setActivePortfolioStats(result.stats);
        setActivePortfolioId(p.id);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load portfolio allocations");
    } finally {
      setLoadingPortfolio(false);
    }
  };

  // Online/Offline tracking
  const [isOnline, setIsOnline] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const goOnline = () => setIsOnline(true);
      const goOffline = () => setIsOnline(false);
      window.addEventListener("online", goOnline);
      window.addEventListener("offline", goOffline);

      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        setInstallPromptEvent(e);
      });

      return () => {
        window.removeEventListener("online", goOnline);
        window.removeEventListener("offline", goOffline);
      };
    }
  }, []);

  const handleInstallPWA = () => {
    if (installPromptEvent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (installPromptEvent as any).prompt();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (installPromptEvent as any).userChoice.then(() => {
        setInstallPromptEvent(null);
      });
    } else {
      alert("Installation shortcut is not available on this browser. For iPhone, please tap the 'Share' icon and select 'Add to Home Screen'.");
    }
  };

  const handleAddCryptoTransaction = async () => {
    setLoadingTx(true);
    try {
      const res = await fetch("/api/crypto/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: txSymbol,
          amount: txAmount,
          price: txPrice,
          type: txType,
        }),
      });
      if (res.ok) {
        alert("Transaction added and holdings updated successfully!");
        await refetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleRegenerateCryptoSignals = async () => {
    setSyncingCrypto(true);
    try {
      const res = await fetch("/api/crypto/signals", { method: "POST" });
      if (res.ok) {
        alert("Crypto indicators, Fibonacci levels, and AI scores recalculated successfully!");
        await refetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingCrypto(false);
    }
  };

  const handleRegenerateUSSignals = async () => {
    setSyncingUS(true);
    try {
      const res = await fetch("/api/us-stocks/signals", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        await refetchData();
        if (data.rateLimitHit) {
          alert("Alpha Vantage API rate limit reached! Displaying simulated US stock indicators.");
        } else {
          alert("US stock quotes and predictive analysis signals regenerated successfully!");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingUS(false);
    }
  };

  const fetchChatSessions = async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        setChatSessions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectChatSession = async (sessionId: string) => {
    setChatSessionId(sessionId);
    setChatMessages([]);
    try {
      const res = await fetch(`/api/chat?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(JSON.parse(data.messages));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatQuestion.trim()) return;
    setLoadingChat(true);
    const q = chatQuestion;
    setChatQuestion("");
    
    setChatMessages(prev => [...prev, { role: "user", content: q, createdAt: new Date().toISOString() }]);
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          sessionId: chatSessionId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatSessionId(data.sessionId);
        setChatMessages(data.messages);
        await fetchChatSessions();
      } else {
        alert("Failed to send research query.");
      }
    } catch (e) {
      console.error(e);
      alert("Error querying RAG assistant.");
    } finally {
      setLoadingChat(false);
    }
  };

  const handleCreateNewChatSession = () => {
    setChatSessionId(null);
    setChatMessages([]);
    setChatQuestion("");
  };

  const handleDeleteChatSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this chat session?")) return;
    try {
      const res = await fetch(`/api/chat?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchChatSessions();
        if (chatSessionId === id) {
          handleCreateNewChatSession();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [stocksRes, sportsRes, calendarRes, portfolioRes, chatRes, usStocksRes, cryptoRes, cryptoPortfolioRes, indicesRes, settingsRes] = await Promise.all([
          fetch("/api/stocks").then((r) => r.json()),
          fetch("/api/sports").then((r) => r.json()),
          fetch("/api/calendar").then((r) => r.json()),
          fetch("/api/portfolio").then((r) => r.json()),
          fetch("/api/chat").then((r) => r.json()),
          fetch("/api/us-stocks").then((r) => r.json()),
          fetch("/api/crypto").then((r) => r.json()),
          fetch("/api/crypto/portfolio").then((r) => r.json()),
          fetch("/api/indices").then((r) => r.json()),
          fetch("/api/settings").then((r) => r.json()),
        ]);

        if (stocksRes.stocks) {
          setStocks(stocksRes.stocks);
          const initialWeights: Record<string, number> = {};
          const n = stocksRes.stocks.length;
          if (n > 0) {
            const even = Math.floor(100 / n);
            stocksRes.stocks.forEach((s: Stock, idx: number) => {
              initialWeights[s.ticker] = idx === 0 ? even + (100 - even * n) : even;
            });
            setPortfolioWeights(initialWeights);
          }
        }
        if (stocksRes.signals) setSignals(stocksRes.signals);
        setFixtures(sportsRes || []);
        setEvents(calendarRes || []);
        setSavedPortfolios(portfolioRes || []);
        setChatSessions(chatRes || []);

        if (usStocksRes.stocks) setUsStocks(usStocksRes.stocks);
        if (usStocksRes.signals) setUsSignals(usStocksRes.signals);

        if (cryptoRes.assets) setCryptoAssets(cryptoRes.assets);
        if (cryptoRes.signals) setCryptoSignals(cryptoRes.signals);
        if (cryptoPortfolioRes.summary) setCryptoPortfolio(cryptoPortfolioRes.summary);

        if (indicesRes) setIndices(indicesRes);
        if (settingsRes) {
          if (settingsRes.apiKeyFields) setApiKeyFields(settingsRes.apiKeyFields);
          if (settingsRes.limits) setLimits(settingsRes.limits);
        }
        fetchAlerts();
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-pulse">
        <div className="h-10 bg-slate-800 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-800 rounded"></div>
          <div className="h-32 bg-slate-800 rounded"></div>
          <div className="h-32 bg-slate-800 rounded"></div>
        </div>
        <div className="h-64 bg-slate-800 rounded w-full"></div>
      </div>
    );
  }

  // Sports calculation helpers
  const sortedFixtures = [...fixtures].sort((a, b) => {
    if (a.status === "scheduled" && b.status === "finished") return -1;
    if (a.status === "finished" && b.status === "scheduled") return 1;
    
    const dateA = new Date(a.eventDate).getTime();
    const dateB = new Date(b.eventDate).getTime();
    
    if (a.status === "scheduled") {
      // Upcoming: sort ascending (soonest first)
      return dateA - dateB;
    } else {
      // Finished: sort descending (most recent first)
      return dateB - dateA;
    }
  });

  const topPickAcrossEverything = [...fixtures]
    .filter((f) => f.predictions && f.predictions.length > 0)
    .sort((a, b) => (b.predictions[0]?.confidence || 0) - (a.predictions[0]?.confidence || 0))[0];

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pb-16">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-border/50 pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {currentTab === "india" && "India Market Workspace"}
            {currentTab === "top" && "Top Signals Today"}
            {currentTab === "us" && "US Market Workspace"}
            {currentTab === "crypto" && "Cryptocurrency Intelligence"}
            {currentTab === "indices" && "Global Indices Tracker"}
            {currentTab === "sports" && "Sports Forecast Analytics"}
            {currentTab === "portfolio" && "MPT Portfolio Studio"}
            {currentTab === "research" && "RAG AI Research Studio"}
            {currentTab === "calendar" && "Macro Economic Calendar"}
            {currentTab === "backtest" && "Backtesting Strategy Studio"}
            {currentTab === "alerts" && "Real-Time Alerts Control"}
            {currentTab === "settings" && "Platform Parameters Settings"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {currentTab === "india" && "Real-time NSE/BSE stock signals, technical indicators, and news sentiment."}
            {currentTab === "top" && "High-confidence predictive rankings across Global Equities, Crypto, and Sports."}
            {currentTab === "us" && "Predictive signals and fundamentals for S&P 500, NASDAQ, and NYSE equities."}
            {currentTab === "crypto" && "Fear & Greed indicators, on-chain scores, Fibonacci levels, and correlation matrices."}
            {currentTab === "indices" && "Global benchmark trackers with synchronized quotes."}
            {currentTab === "sports" && "Predictive Elo analytics, streak indicators, and model validation logs."}
            {currentTab === "portfolio" && "Monte Carlo efficient frontier optimizations and annualized metrics."}
            {currentTab === "research" && "Explainable RAG knowledge base search assistant."}
            {currentTab === "calendar" && "High-impact macro events and affected sector mappings."}
            {currentTab === "backtest" && "Run strategy trade simulations over historical price sets."}
            {currentTab === "alerts" && "Setup threshold target alerts for watchlist assets."}
            {currentTab === "settings" && "Configure risk limits and manage external provider API keys."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Offline Mode Indicator */}
          {!isOnline && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
              Offline Mode (Cached Data)
            </span>
          )}

          {/* PWA Install Button */}
          {installPromptEvent && (
            <button
              onClick={handleInstallPWA}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md transition-all scale-95"
            >
              🚀 Install App
            </button>
          )}

          {currentTab === "india" && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold hover:bg-indigo-500/30 transition-all duration-200"
            >
              <Cpu className="w-4 h-4" /> {analyzing ? "Analyzing..." : "Analyze India News"}
            </button>
          )}

          {currentTab === "us" && (
            <button
              onClick={handleRegenerateUSSignals}
              disabled={syncingUS}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold hover:bg-indigo-500/30 transition-all duration-200"
            >
              <Cpu className="w-4 h-4" /> {syncingUS ? "Analyzing..." : "Analyze US Stocks"}
            </button>
          )}

          {currentTab === "crypto" && (
            <button
              onClick={handleRegenerateCryptoSignals}
              disabled={syncingCrypto}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold hover:bg-indigo-500/30 transition-all duration-200"
            >
              <Cpu className="w-4 h-4" /> {syncingCrypto ? "Recalculating..." : "Recalculate Crypto Signals"}
            </button>
          )}

          <div className="flex gap-3 text-xs bg-slate-900 border border-border px-3 py-1.5 rounded-full text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              Database: Connected
            </span>
          </div>
        </div>
      </div>

      {/* 0. TOP SIGNALS TODAY TAB */}
      {currentTab === "top" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <TopSignalsToday />
        </div>
      )}

      {/* 1. INDIA TAB */}
      {currentTab === "india" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Top Indian Buy Recommendations Banner */}
          <div className="glass rounded-2xl p-5 border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  🇮🇳 Top Recommended Buys
                </span>
                <span className="text-xs text-slate-400 font-mono font-semibold">India NSE/BSE Radar</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Highest Confidence Indian Stock Buys Today
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {signals
                .filter((s) => s.recommendation.toLowerCase().includes("bullish"))
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 3)
                .map((sig) => (
                  <div key={sig.id} className="bg-slate-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2">
                    <span className="font-bold text-xs text-white font-mono">{sig.ticker}</span>
                    <span className="text-[10px] font-bold text-emerald-400 px-1.5 py-0.5 bg-emerald-500/10 rounded">
                      Buy ({Math.round(sig.confidence * 100)}%)
                    </span>
                  </div>
                ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-400" /> India Watchlist Intel
                  </h3>
                  <button 
                    onClick={() => setManageTickersOpen(true)}
                    className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-semibold hover:bg-indigo-500/20 transition-all cursor-pointer"
                  >
                    Active Tickers
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead>
                      <tr className="border-b border-border/80 text-slate-500 font-medium">
                        <th className="py-2.5">Asset</th>
                        <th className="py-2.5">Price</th>
                        <th className="py-2.5">Change</th>
                        <th className="py-2.5">AI Rating</th>
                        <th className="py-2.5 text-right">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {stocks.map((stock) => {
                        const sig = signals.find((s) => s.ticker === stock.ticker);
                        const isUp = stock.change >= 0;
                        return (
                          <tr 
                            key={stock.id} 
                            onClick={() => handleSelectStock(stock.ticker)}
                            className="hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <td className="py-3 font-semibold text-white">
                              <div className="flex items-center gap-1.5">
                                {stock.ticker}
                                {stock.syncError && (
                                  <span 
                                    className="text-amber-500 cursor-help" 
                                    title={`Sync issue: ${stock.syncError}`}
                                  >
                                    ⚠️
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-normal text-slate-500">{stock.name}</div>
                            </td>
                            <td className="py-3 font-mono">₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className={`py-3 font-mono font-medium ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                              <span className="flex items-center gap-0.5">
                                {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                {isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
                              </span>
                            </td>
                            <td className="py-3">
                              {sig ? (
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  sig.recommendation === "Bullish" 
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                }`}>
                                  {sig.recommendation}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs">Neutral</span>
                              )}
                            </td>
                            <td className="py-3 font-mono text-right font-medium text-white">
                              {sig ? `${Math.round(sig.confidence * 100)}%` : "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="font-bold text-lg text-white mb-2">Technical Summary</h3>
                <p className="text-slate-400 text-xs leading-relaxed">AI engine parses daily technical indicators (RSI, Bollinger Bands breakout parameters) mapped over SQLite historical candles.</p>
              </div>
              <div className="h-44 w-full bg-slate-950/20 rounded-xl border border-border/40 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                    <YAxis stroke="#475569" fontSize={10} />
                    <ChartTooltip contentStyle={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                    <Line type="monotone" dataKey="AAPL" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="MSFT" stroke="#10b981" strokeWidth={2} dot={false} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. US STOCKS TAB */}
      {currentTab === "us" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-2xl p-5 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" /> US Watchlist Intel
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setManageTickersOpen(true)}
                    className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 px-3 py-1 rounded font-bold transition-all"
                  >
                    Active Tickers
                  </button>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-900 border border-border text-slate-500 rounded font-mono">NASDAQ & NYSE</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead>
                    <tr className="border-b border-border/80 text-slate-500 font-medium">
                      <th className="py-2.5">Asset</th>
                      <th className="py-2.5">Price</th>
                      <th className="py-2.5">24h Change</th>
                      <th className="py-2.5">AI Rating</th>
                      <th className="py-2.5 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {usStocks.map((stock) => {
                      const sig = usSignals.find((s) => s.ticker === stock.ticker);
                      const isUp = stock.change >= 0;
                      return (
                        <tr 
                          key={stock.id} 
                          onClick={() => handleSelectStock(stock.ticker)}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <td className="py-3 font-semibold text-white">
                            <div className="flex items-center gap-1.5">
                              {stock.ticker}
                              {stock.syncError && (
                                <span 
                                  className="text-amber-500 cursor-help" 
                                  title={`Sync issue: ${stock.syncError}`}
                                >
                                  ⚠️
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-normal text-slate-500">{stock.name}</div>
                          </td>
                          <td className="py-3 font-mono">${stock.price.toFixed(2)}</td>
                          <td className={`py-3 font-mono font-medium ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                            <span className="flex items-center gap-0.5">
                              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                              {isUp ? "+" : ""}{stock.changePercent.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3">
                            {sig ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                sig.recommendation === "Bullish" 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}>
                                {sig.recommendation}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">Neutral</span>
                            )}
                          </td>
                          <td className="py-3 font-mono text-right font-medium text-white">
                            {sig ? `${Math.round(sig.confidence * 100)}%` : "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="font-bold text-lg text-white mb-2">US Technical Summary</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Quantitative algorithms parse daily technical indicators mapped over NYSE and NASDAQ historical candles.</p>
              </div>
              <div className="h-44 w-full bg-slate-950/20 rounded-xl border border-border/40 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                    <YAxis stroke="#475569" fontSize={10} />
                    <ChartTooltip contentStyle={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                    <Line type="monotone" dataKey="AAPL" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="MSFT" stroke="#10b981" strokeWidth={2} dot={false} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CRYPTOCURRENCY TAB */}
      {currentTab === "crypto" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Crypto Fear & Greed Index */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-950/40 border border-border/50 p-5 rounded-2xl flex flex-col justify-between min-h-[110px]">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Fear & Greed Index</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-indigo-400 font-mono">68</span>
                <span className="text-xs text-slate-400">Greed</span>
              </div>
            </div>
            <div className="bg-slate-950/40 border border-border/50 p-5 rounded-2xl flex flex-col justify-between min-h-[110px]">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Portfolio Value</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                  ${cryptoPortfolio ? cryptoPortfolio.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0.00"}
                </span>
              </div>
            </div>
            <div className="bg-slate-950/40 border border-border/50 p-5 rounded-2xl flex flex-col justify-between min-h-[110px]">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Portfolio Profit/Loss</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold font-mono ${cryptoPortfolio && cryptoPortfolio.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {cryptoPortfolio && cryptoPortfolio.totalProfit >= 0 ? "+" : ""}${cryptoPortfolio ? cryptoPortfolio.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0.00"}
                </span>
                <span className="text-xs text-slate-500">
                  ({cryptoPortfolio ? cryptoPortfolio.totalProfitPercent.toFixed(2) : "0.00"}%)
                </span>
              </div>
            </div>
            <div className="bg-slate-950/40 border border-border/50 p-5 rounded-2xl flex flex-col justify-between min-h-[110px]">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Risk Rating Score</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-500 font-mono">
                  {cryptoPortfolio ? cryptoPortfolio.portfolioRiskScore : "0"} / 10
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-2xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-white">Crypto Asset Intelligence</h3>
                <button
                  onClick={() => setManageTickersOpen(true)}
                  className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 px-3 py-1 rounded font-bold transition-all"
                >
                  Active Tickers
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead>
                    <tr className="border-b border-border/80 text-slate-500 font-medium">
                      <th className="py-2.5">Asset</th>
                      <th className="py-2.5">Price</th>
                      <th className="py-2.5">24h Change</th>
                      <th className="py-2.5">Market Cap</th>
                      <th className="py-2.5">AI Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {cryptoAssets.map((asset) => {
                      const sig = cryptoSignals.find((s) => s.symbol === asset.symbol);
                      const isUp = asset.change24h >= 0;
                      return (
                        <tr key={asset.id} className="hover:bg-white/5 transition-colors cursor-pointer">
                          <td className="py-3 font-semibold text-white">
                            <div>{asset.symbol}</div>
                            <div className="text-[10px] font-normal text-slate-500">{asset.name}</div>
                          </td>
                          <td className="py-3 font-mono">${asset.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                          <td className={`py-3 font-mono font-medium ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                            {isUp ? "+" : ""}{asset.change24h.toFixed(2)}%
                          </td>
                          <td className="py-3 font-mono">${(asset.marketCap / 1e9).toFixed(2)}B</td>
                          <td className="py-3">
                            {sig ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                sig.recommendation === "Bullish" 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}>
                                {sig.recommendation}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">Neutral</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Crypto Portfolio Adder */}
            <div className="glass rounded-2xl p-5 flex flex-col gap-4">
              <h3 className="font-bold text-lg text-white">Add Crypto Holding</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 font-mono">Token Symbol</label>
                  <select
                    value={txSymbol}
                    onChange={(e) => setTxSymbol(e.target.value)}
                    className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs font-mono"
                  >
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="SOL">SOL</option>
                    <option value="BNB">BNB</option>
                    <option value="XRP">XRP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 font-mono">Holding Amount</label>
                  <input
                    type="number"
                    step="any"
                    value={txAmount}
                    onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 font-mono">Purchase Price (USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={txPrice}
                    onChange={(e) => setTxPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1 font-mono">Transaction Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTxType("BUY")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${txType === "BUY" ? "bg-emerald-500/25 border border-emerald-500/40 text-emerald-400" : "bg-slate-900 border border-border text-slate-400"}`}
                    >
                      BUY
                    </button>
                    <button
                      onClick={() => setTxType("SELL")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${txType === "SELL" ? "bg-rose-500/25 border border-rose-500/40 text-rose-400" : "bg-slate-900 border border-border text-slate-400"}`}
                    >
                      SELL
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleAddCryptoTransaction}
                  disabled={loadingTx}
                  className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-200 mt-2 disabled:opacity-50"
                >
                  {loadingTx ? "Logging..." : "Log Transaction"}
                </button>
              </div>
            </div>
          </div>

          {/* Pearson Correlation Matrix Card */}
          {cryptoPortfolio && cryptoPortfolio.holdings.length > 1 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-bold text-base text-white mb-1.5">Asset Correlation Matrix</h3>
              <p className="text-slate-500 text-[10px] mb-4">Calculates Pearson coefficient matrix based on 30-day historical quote returns. Green indicates high correlation, red denotes inverse correlation.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs text-slate-300 font-mono">
                  <thead>
                    <tr className="border-b border-border/80 text-slate-500">
                      <th className="py-2 text-left">Asset</th>
                      {cryptoPortfolio.holdings.map((h) => (
                        <th key={h.symbol} className="py-2">{h.symbol}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {cryptoPortfolio.holdings.map((h1) => (
                      <tr key={h1.symbol}>
                        <td className="py-3 font-semibold text-white text-left">{h1.symbol}</td>
                        {cryptoPortfolio.holdings.map((h2) => {
                          const val = cryptoPortfolio.correlationMatrix[h1.symbol]?.[h2.symbol] ?? 0;
                          return (
                            <td 
                              key={h2.symbol} 
                              className={`py-3 font-bold ${val > 0.7 ? "text-emerald-400" : val < 0.2 ? "text-rose-400" : "text-slate-400"}`}
                            >
                              {val.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. GLOBAL INDICES TAB */}
      {currentTab === "indices" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="glass rounded-2xl p-5 border border-border/50">
            <h3 className="font-bold text-lg text-white mb-4">Global Index Benchmarks</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-border/80 text-slate-500 font-medium">
                    <th className="py-2.5">Benchmark Index</th>
                    <th className="py-2.5">Ticker</th>
                    <th className="py-2.5">Current Value</th>
                    <th className="py-2.5">24h Change</th>
                    <th className="py-2.5 text-right">Last Synchronized</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {indices.map((ind) => {
                    const isUp = ind.change >= 0;
                    return (
                      <tr key={ind.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 font-semibold text-white font-sans">{ind.name}</td>
                        <td className="py-3 text-slate-500 font-semibold">{ind.symbol}</td>
                        <td className="py-3 font-bold">${ind.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className={`py-3 font-medium ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                          {isUp ? "+" : ""}{ind.changePercent.toFixed(2)}%
                        </td>
                        <td className="py-3 text-right text-[10px] text-slate-500">
                          {new Date(ind.lastUpdated).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. SPORTS TAB */}
      {currentTab === "sports" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Top Pick Highlight Card */}
          {topPickAcrossEverything && (() => {
            const p = topPickAcrossEverything.predictions[0];
            return (
              <div className="glass rounded-2xl p-6 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-indigo-950/20 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold">
                    ★
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                        Top Pick Across All Sports
                      </span>
                      <span className="text-xs text-slate-400 font-mono capitalize">{topPickAcrossEverything.sport} • {topPickAcrossEverything.league}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-2">
                      {topPickAcrossEverything.homeTeam} vs {topPickAcrossEverything.awayTeam}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      AI forecast favors <strong className="text-emerald-400">{p.predictedWinner}</strong> to win with <strong className="text-white">{Math.round(p.confidence * 100)}% confidence</strong>.
                      <span className="block mt-1 text-slate-500 font-normal italic">Reasoning: {p.reason}</span>
                    </p>
                  </div>
                </div>
                <div className="w-full md:w-auto bg-slate-950/60 border border-border/40 p-4 rounded-xl text-center md:text-right flex flex-row md:flex-col justify-between items-center md:items-end gap-2 min-w-[160px]">
                  <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">Win Chance</div>
                  <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">{Math.round(p.confidence * 100)}%</div>
                </div>
              </div>
            );
          })()}

          {/* Top Sports Winning Teams Banner */}
          <div className="glass rounded-2xl p-5 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-indigo-950/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  ⚽ Highest Win Probabilities
                </span>
                <span className="text-xs text-slate-400 font-mono font-semibold">Elo & Odds Forecast</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Teams With Highest Winning Chance Today
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {fixtures
                .filter((f) => f.predictions && f.predictions.length > 0)
                .sort((a, b) => (b.predictions[0]?.confidence || 0) - (a.predictions[0]?.confidence || 0))
                .slice(0, 3)
                .map((f) => {
                  const p = f.predictions[0];
                  return (
                    <div key={f.id} className="bg-slate-950/80 border border-indigo-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2">
                      <span className="font-bold text-xs text-white truncate max-w-[130px]">{p.predictedWinner}</span>
                      <span className="text-[10px] font-bold text-indigo-300 px-1.5 py-0.5 bg-indigo-500/10 rounded font-mono">
                        {Math.round(p.confidence * 100)}% Win Chance
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
          {/* Sports predictions fixture cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedFixtures.map((fixture) => {
              const pred = fixture.predictions[0];
              const homePercent = pred ? Math.round(pred.homeProb * 100) : 33;
              const drawPercent = pred ? Math.round(pred.drawProb * 100) : 34;
              const awayPercent = pred ? Math.round(pred.awayProb * 100) : 33;
              const hasScore = fixture.homeScore !== null && fixture.awayScore !== null;
              
              return (
                <div key={fixture.id} className="glass rounded-2xl p-5 border border-border/50 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 font-mono mb-3">
                      <span>{fixture.sport} • {fixture.league}</span>
                      <span className="px-2 py-0.5 bg-slate-900 border border-border rounded text-slate-400">{fixture.status}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm font-bold text-white mb-4">
                      <span className="flex-1 text-left">{fixture.homeTeam}</span>
                      <span className="px-3 py-1 bg-slate-950 border border-border rounded font-mono mx-2">
                        {hasScore ? `${fixture.homeScore} - ${fixture.awayScore}` : "VS"}
                      </span>
                      <span className="flex-1 text-right">{fixture.awayTeam}</span>
                    </div>

                    {pred ? (
                      <div className="flex flex-col gap-2 mt-4">
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>AI Forecast: <strong className="text-white">{pred.predictedWinner}</strong></span>
                          <span>Confidence: <strong>{Math.round(pred.confidence * 100)}%</strong></span>
                        </div>
                        {/* Probability slider bar */}
                        <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-900 border border-border/40">
                          <div style={{ width: `${homePercent}%` }} className="bg-indigo-500" title={`Home Win: ${homePercent}%`}></div>
                          <div style={{ width: `${drawPercent}%` }} className="bg-slate-700" title={`Draw: ${drawPercent}%`}></div>
                          <div style={{ width: `${awayPercent}%` }} className="bg-emerald-500" title={`Away Win: ${awayPercent}%`}></div>
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-mono text-slate-500">
                          <span>Home ({homePercent}%)</span>
                          <span>Draw ({drawPercent}%)</span>
                          <span>Away ({awayPercent}%)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-3 border-t border-border/20 flex justify-between items-center">
                        <span className="text-xs text-slate-500 italic">No forecast computed.</span>
                        <button
                          onClick={() => handlePredictSports(fixture.id)}
                          disabled={predictingFixtureId === fixture.id}
                          className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold disabled:opacity-50"
                        >
                          {predictingFixtureId === fixture.id ? "Analyzing..." : "Calculate AI Predict"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. PORTFOLIO TAB */}
      {currentTab === "portfolio" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-2xl p-5 border border-border/50 flex flex-col gap-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" /> Multi-Asset Portfolio Allocator
                </h3>
                <p className="text-xs text-slate-400 mt-1">Assign capital weights across watchlisted assets. Total weights must sum to exactly 100%.</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5 font-mono">Strategy Name</label>
                    <input
                      type="text"
                      value={portfolioName}
                      onChange={(e) => setPortfolioName(e.target.value)}
                      className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5 font-mono">Capital Size ($)</label>
                    <input
                      type="number"
                      value={portfolioCapital}
                      onChange={(e) => setPortfolioCapital(parseInt(e.target.value) || 10000)}
                      className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-border/30 pt-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">Allocation Weights (%)</span>
                  {(() => {
                    const allAssets = [
                      ...stocks.map(s => ({ id: s.id, ticker: s.ticker, price: s.price, currency: "₹", type: "in" })),
                      ...usStocks.map(s => ({ id: s.id, ticker: s.ticker, price: s.price, currency: "$", type: "us" })),
                      ...cryptoAssets.map(s => ({ id: s.id, ticker: s.symbol, price: s.price, currency: "$", type: "crypto" })),
                    ];
                    if (allAssets.length === 0) {
                      return (
                        <div className="text-slate-500 text-xs italic py-2">
                          No watchlisted assets available. Add tickers to watchlist.
                        </div>
                      );
                    }
                    return allAssets.map((asset) => {
                      const w = portfolioWeights[asset.ticker] || 0;
                      return (
                        <div key={asset.id + "-" + asset.type} className="flex items-center gap-4 text-xs">
                          <div className="w-24 flex flex-col justify-center">
                            <span className="font-bold text-white font-mono leading-none">{asset.ticker}</span>
                            <span className="text-[9px] text-slate-500 font-mono mt-1">
                              {asset.currency}{asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={w}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setPortfolioWeights(prev => ({ ...prev, [asset.ticker]: val }));
                            }}
                            className="flex-1 h-1.5 bg-slate-900 border border-border/40 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                          <span className="w-12 text-right font-mono font-bold text-white">{w}%</span>
                        </div>
                      );
                    });
                  })()}
                </div>

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/30">
                  <span className={`text-xs font-bold font-mono ${
                    Object.values(portfolioWeights).reduce((a, b) => a + b, 0) === 100 ? "text-emerald-400" : "text-rose-400 animate-pulse"
                  }`}>
                    Total Weights: {Object.values(portfolioWeights).reduce((a, b) => a + b, 0)}% (must be 100%)
                  </span>
                  <button
                    onClick={handleOptimizePortfolio}
                    disabled={loadingPortfolio || Object.values(portfolioWeights).reduce((a, b) => a + b, 0) !== 100}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all duration-200 disabled:opacity-50"
                  >
                    {loadingPortfolio ? "Optimizing..." : "Optimize & Save Strategy"}
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Portfolios List Card */}
            <div className="glass rounded-2xl p-5 border border-border/50 flex flex-col gap-4">
              <h3 className="font-bold text-white text-sm">Saved Portfolios</h3>
              <div className="flex-1 overflow-y-auto max-h-[360px] flex flex-col gap-3">
                {savedPortfolios.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs italic">No saved strategy portfolios.</div>
                ) : (
                  savedPortfolios.map((p) => {
                    const parsedAssets = JSON.parse(p.assets) as AssetWeight[];
                    return (
                      <div key={p.id} className="bg-slate-950/40 border border-border/60 p-3 rounded-xl flex flex-col gap-2 hover:border-indigo-500/30 transition-all text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-sm">{p.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">${p.allocation.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {parsedAssets.map((a: AssetWeight, idx: number) => (
                            <span key={idx} className="bg-slate-900 border border-border/50 text-[9px] font-semibold text-slate-400 px-1.5 py-0.5 rounded font-mono">
                              {a.ticker}: {Math.round(a.weight * 100)}%
                            </span>
                          ))}
                        </div>
                        <div className="flex justify-between items-center text-[10px] border-t border-border/30 pt-2 text-slate-400 font-mono mt-1">
                          <span>Return: <strong className="text-emerald-400">{(p.expectedReturn * 100).toFixed(1)}%</strong></span>
                          <span>Sharpe: <strong>{p.sharpeRatio.toFixed(2)}</strong></span>
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => handleLoadPortfolio(p)}
                              className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => handleDeletePortfolio(p.id)}
                              className="text-rose-400 hover:text-rose-300 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {activePortfolioStats ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="flex flex-col gap-4">
                <div className="bg-slate-950/40 border border-border/50 p-4 rounded-xl flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Annualized Return</span>
                  <div className="mt-1">
                    <span className="text-xl font-mono font-bold text-emerald-400">
                      {(activePortfolioStats.expectedReturn * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="bg-slate-950/40 border border-border/50 p-4 rounded-xl flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Annualized Volatility</span>
                  <div className="mt-1">
                    <span className="text-xl font-mono font-bold text-rose-400">
                      {(activePortfolioStats.volatility * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="bg-slate-950/40 border border-border/50 p-4 rounded-xl flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Sharpe Ratio</span>
                  <div className="mt-1">
                    <span className="text-xl font-mono font-bold text-white">
                      {activePortfolioStats.sharpeRatio.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>

              {/* MPT frontier scatter plot */}
              <div className="lg:col-span-2 glass rounded-2xl p-5 border border-border/50">
                <h4 className="font-bold text-white text-sm mb-4">Markowitz Efficient Frontier Curve</h4>
                <div className="h-64 w-full bg-slate-950/30 p-2 rounded-xl border border-border/40">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                      <XAxis 
                        type="number" 
                        dataKey="volatility" 
                        name="Volatility" 
                        unit="%" 
                        stroke="#475569" 
                        fontSize={10} 
                        domain={["auto", "auto"]}
                        label={{ value: 'Annual Volatility (%)', position: 'bottom', fill: '#475569', fontSize: 10, offset: 0 }} 
                      />
                      <YAxis 
                        type="number" 
                        dataKey="expectedReturn" 
                        name="Expected Return" 
                        unit="%" 
                        stroke="#475569" 
                        fontSize={10} 
                        domain={["auto", "auto"]}
                        label={{ value: 'Expected Return (%)', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 10, offset: 0 }} 
                      />
                      <ChartTooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      />
                      <Scatter 
                        name="Efficient Frontier" 
                        data={activePortfolioStats.frontier.map((p: FrontierPoint) => ({
                          volatility: parseFloat((p.volatility * 100).toFixed(2)),
                          expectedReturn: parseFloat((p.expectedReturn * 100).toFixed(2)),
                        }))} 
                        fill="#6366f1" 
                        opacity={0.3} 
                      />
                      <Scatter 
                        name="Current" 
                        data={[{
                          volatility: parseFloat((activePortfolioStats.volatility * 100).toFixed(2)),
                          expectedReturn: parseFloat((activePortfolioStats.expectedReturn * 100).toFixed(2)),
                        }]} 
                        fill="#f59e0b" 
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-slate-500 text-xs border border-dashed border-border/60 rounded-2xl">
              Adjust weights above to sum to 100% and click &quot;Optimize &amp; Save Strategy&quot; to view Markowitz Efficient Frontier scatter curves.
            </div>
          )}
        </div>
      )}

      {/* 7. AI RESEARCH TAB */}
      {currentTab === "research" && (
        <div className="flex flex-col gap-6 animate-fade-in glass rounded-2xl border border-border/60 h-[500px] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center bg-slate-950/60 p-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <div>
                <h4 className="font-bold text-white text-sm">Signal RAG Research AI Workspace</h4>
                <p className="text-[10px] text-slate-500 font-mono">Interactive Vector KB Citations & Analytics</p>
              </div>
            </div>
            <button
              onClick={handleCreateNewChatSession}
              className="px-2.5 py-1 bg-indigo-500 text-white font-bold text-[10px] rounded hover:bg-indigo-600 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Reset Thread
            </button>
          </div>

          {/* Selector */}
          <div className="bg-slate-950/40 p-2.5 border-b border-border/40">
            <select
              value={chatSessionId || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val) handleSelectChatSession(val);
                else handleCreateNewChatSession();
              }}
              className="w-full max-w-xs bg-slate-900 border border-border/60 px-2.5 py-1 rounded text-white text-[10px] font-mono"
            >
              <option value="">-- Active Conversation Thread --</option>
              {chatSessions.map((s) => (
                <option key={s.id} value={s.id}>{s.sessionName}</option>
              ))}
            </select>
          </div>

          {/* Chat Window Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-950/10">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 gap-2">
                <Cpu className="w-8 h-8 text-slate-700 animate-bounce" />
                <p className="font-semibold text-xs text-slate-400">RAG Vector Retrieval Assistant</p>
                <p className="text-[10px] max-w-sm leading-relaxed">Search watchlist stock prices, FinBERT sentiments index, and macroeconomic event parameters.</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div key={idx} className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "self-end items-end" : "self-start items-start"}`}>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {isUser ? "You" : "Signal AI"} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className={`p-3 rounded-xl border text-xs leading-relaxed ${isUser ? "bg-indigo-500/20 text-indigo-100 border-indigo-500/30" : "bg-slate-900/60 text-slate-200 border-border/80"}`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-border/30 flex flex-col gap-1">
                          <span className="text-[8px] text-slate-500 uppercase font-bold">Citation Documents:</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {msg.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-slate-950 border border-border/40 text-[8px] text-slate-400 px-1.5 py-0.5 rounded font-mono hover:text-white"
                              >
                                {src.source} ({src.date})
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {loadingChat && (
              <div className="self-start flex flex-col gap-1">
                <span className="text-[9px] text-slate-500 font-mono">Assistant is searching files...</span>
                <div className="bg-slate-900 border border-border/80 p-2.5 rounded-xl flex items-center gap-1">
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Message input */}
          <div className="bg-slate-950/60 p-3 border-t border-border/60 flex items-center gap-2">
            <input
              type="text"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendChatMessage();
              }}
              placeholder="Ask Signal RAG (e.g. latest Apple news...)"
              className="flex-1 bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs"
            />
            <button
              onClick={handleSendChatMessage}
              disabled={loadingChat || !chatQuestion.trim()}
              className="p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 text-white rounded-xl transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 8. CALENDAR TAB */}
      {currentTab === "calendar" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="glass rounded-2xl p-5 border border-border/50 flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 font-mono mb-2">
                    <span>{event.country}</span>
                    <span className={`px-2 py-0.5 rounded ${
                      event.impact === "High" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-slate-900 text-slate-500"
                    }`}>{event.impact} Impact</span>
                  </div>
                  <h4 className="font-bold text-white text-sm mb-1.5">{event.title}</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">{event.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/20 flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span>Forecast: {event.forecast ?? "N/A"} / Prev: {event.previous ?? "N/A"}</span>
                  <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. BACKTEST TAB */}
      {currentTab === "backtest" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="glass rounded-2xl p-5 border border-border/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" /> Backtest Simulation Parameters
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5 font-mono">Asset Ticker</label>
                <select
                  value={backtestTicker || ""}
                  onChange={(e) => setBacktestTicker(e.target.value)}
                  className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs"
                >
                  <option value="" disabled>Select Asset</option>
                  {stocks.map(s => (
                    <option key={s.id + "-in"} value={s.ticker}>{s.ticker} ({s.exchange || "NSE"})</option>
                  ))}
                  {usStocks.map(s => (
                    <option key={s.id + "-us"} value={s.ticker}>{s.ticker} (NASDAQ)</option>
                  ))}
                  {cryptoAssets.map(a => (
                    <option key={a.id + "-crypto"} value={a.symbol}>{a.symbol} (Crypto)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5 font-mono">Trading Strategy</label>
                <select
                  value={backtestStrategy}
                  onChange={(e) => setBacktestStrategy(e.target.value as "rsi" | "macd" | "sma_cross")}
                  className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs"
                >
                  <option value="rsi">RSI Mean Reversion (30 / 70)</option>
                  <option value="macd">MACD Signal Crossover</option>
                  <option value="sma_cross">SMA Golden / Death Cross</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5 font-mono">Initial Capital ($)</label>
                <input
                  type="number"
                  value={backtestCapital}
                  onChange={(e) => setBacktestCapital(parseInt(e.target.value) || 10000)}
                  className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5 font-mono">Start Date</label>
                <input
                  type="date"
                  value={backtestStart}
                  onChange={(e) => setBacktestStart(e.target.value)}
                  className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs font-mono"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5 font-mono">End Date</label>
                  <input
                    type="date"
                    value={backtestEnd}
                    onChange={(e) => setBacktestEnd(e.target.value)}
                    className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs font-mono"
                  />
                </div>
                <button
                  onClick={handleRunBacktest}
                  disabled={runningBacktest}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 h-9"
                >
                  {runningBacktest ? "Running..." : "Run"}
                </button>
              </div>
            </div>
          </div>

          {runningBacktest ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-xs font-mono">Running daily candle trade step simulator...</p>
            </div>
          ) : backtestResults ? (
            <div className="flex flex-col gap-6">
              {backtestResults.dataSource === "simulated" && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex flex-col gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.1)] animate-pulse">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span>⚠️ Warning: Running on Simulated Price Data</span>
                  </div>
                  <p className="leading-relaxed opacity-90">
                    No historical candle database records were found for <strong>{backtestResults.ticker}</strong> in the selected range, and the live provider query failed. The simulation is running on synthetic prices walked backward from the current price. Seed real historical data for verified backtests.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/40 border border-border/50 p-4 rounded-xl flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Strategy CAGR</span>
                  <div className="mt-1">
                    <span className={`text-xl font-mono font-bold ${backtestResults.cagr >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {(backtestResults.cagr * 100).toFixed(2)}%
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">vs Benchmark: {(backtestResults.benchmarkCagr * 100).toFixed(2)}%</span>
                  </div>
                </div>
                <div className="bg-slate-950/40 border border-border/50 p-4 rounded-xl flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Max Drawdown</span>
                  <div className="mt-1">
                    <span className="text-xl font-mono font-bold text-rose-400">
                      {(backtestResults.maxDrawdown * 100).toFixed(2)}%
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">vs Benchmark: {(backtestResults.benchmarkMaxDrawdown * 100).toFixed(2)}%</span>
                  </div>
                </div>
                <div className="bg-slate-950/40 border border-border/50 p-4 rounded-xl flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Win Rate</span>
                  <div className="mt-1">
                    <span className="text-xl font-mono font-bold text-white">
                      {(backtestResults.winRate * 100).toFixed(1)}%
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">Trades Count: {backtestResults.tradesCount}</span>
                  </div>
                </div>
                <div className="bg-slate-950/40 border border-border/50 p-4 rounded-xl flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">F1 Score</span>
                  <div className="mt-1">
                    <span className="text-xl font-mono font-bold text-indigo-400">
                      {(backtestResults.f1Score * 100).toFixed(1)}%
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">Prec: {Math.round(backtestResults.precision*100)}% / Rec: {Math.round(backtestResults.recall*100)}%</span>
                  </div>
                </div>
              </div>

              <div className="glass rounded-2xl p-5 border border-border/50">
                <h4 className="font-bold text-white text-sm mb-4">Historical Equity Curve Tracking ($)</h4>
                <div className="h-80 w-full bg-slate-950/30 p-2 rounded-xl border border-border/40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={backtestResults.equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                      <XAxis dataKey="date" stroke="#475569" fontSize={10} />
                      <YAxis stroke="#475569" domain={["auto", "auto"]} fontSize={10} />
                      <ChartTooltip contentStyle={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                      <Line type="monotone" dataKey="strategyValue" stroke="#6366f1" strokeWidth={2} dot={false} name="Strategy portfolio" />
                      <Line type="monotone" dataKey="benchmarkValue" stroke="#64748b" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="Buy & Hold" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs border border-dashed border-border/60 rounded-2xl">
              Configure parameters above and click &quot;Run&quot; to trigger simulation.
            </div>
          )}
        </div>
      )}

      {/* 10. ALERTS TAB */}
      {currentTab === "alerts" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="glass rounded-2xl p-5 border border-border/50 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-4">
              <div>
                <h3 className="font-bold text-lg text-white">Real-Time Threshold Price Alerts</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Setup conditional threshold triggers to notify when an asset price swings above or below targets.
                </p>
              </div>
              <button
                onClick={() => setShowAlertForm(!showAlertForm)}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md self-start sm:self-auto"
              >
                {showAlertForm ? "✕ Cancel" : "+ Add Alert"}
              </button>
            </div>

            {/* Create Alert Form Card */}
            {showAlertForm && (
              <form onSubmit={handleCreateAlert} className="bg-slate-950/60 p-5 rounded-2xl border border-indigo-500/30 flex flex-col gap-4 animate-fade-in">
                <h4 className="font-bold text-sm text-indigo-300 font-mono uppercase">Create New Price Trigger</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5 font-mono">Asset Symbol</label>
                    <input
                      type="text"
                      placeholder="e.g. BTC, ETH, TCS, NVDA"
                      value={alertSymbol}
                      onChange={(e) => setAlertSymbol(e.target.value.toUpperCase())}
                      className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs font-mono font-bold uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5 font-mono font-mono">Trigger Condition</label>
                    <select
                      value={alertType}
                      onChange={(e) => setAlertType(e.target.value as "PRICE_ABOVE" | "PRICE_BELOW")}
                      className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs font-mono font-bold"
                    >
                      <option value="PRICE_ABOVE">Price Rises Above Target (▲)</option>
                      <option value="PRICE_BELOW">Price Falls Below Target (▼)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5 font-mono">Target Price ({alertSymbol.toUpperCase().endsWith(".NS") || alertSymbol.toUpperCase().endsWith(".BO") || alertSymbol.toUpperCase() === "RELIANCE" || alertSymbol.toUpperCase() === "INFY" || alertSymbol.toUpperCase() === "TCS" ? "₹" : "$"})</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 65000"
                      value={alertTarget}
                      onChange={(e) => setAlertTarget(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs font-mono font-bold"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => setShowAlertForm(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingAlert}
                    className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    {creatingAlert ? "Saving Alert..." : "Save Alert"}
                  </button>
                </div>
              </form>
            )}

            {/* Active Alerts Listing */}
            {loadingAlerts ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-slate-400 font-mono">Loading active alerts...</span>
              </div>
            ) : alertsList.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs border border-dashed border-border/50 rounded-2xl flex flex-col items-center gap-3">
                <span>No active price alerts configured yet.</span>
                <button
                  onClick={() => setShowAlertForm(true)}
                  className="px-4 py-1.5 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl font-bold text-xs transition-all"
                >
                  Create Your First Alert
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead>
                    <tr className="border-b border-border/80 text-slate-500 font-medium">
                      <th className="py-2.5">Asset</th>
                      <th className="py-2.5">Condition</th>
                      <th className="py-2.5">Target Threshold</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {alertsList.map((alt) => (
                      <tr key={alt.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 font-bold text-white font-mono">{alt.symbol}</td>
                        <td className="py-3 text-xs font-semibold">
                          {alt.type === "PRICE_ABOVE" ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              ▲ Rises Above
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1">
                              ▼ Falls Below
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-mono font-bold text-indigo-300">{alt.symbol.toUpperCase().endsWith(".NS") || alt.symbol.toUpperCase().endsWith(".BO") || alt.symbol.toUpperCase() === "RELIANCE" || alt.symbol.toUpperCase() === "INFY" || alt.symbol.toUpperCase() === "TCS" ? "₹" : "$"}{alt.target.toLocaleString()}</td>
                        <td className="py-3">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            alt.triggered 
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse" 
                              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          }`}>
                            {alt.triggered ? "Triggered" : "Active Monitor"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDeleteAlert(alt.id)}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition-all"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 11. SETTINGS TAB */}
      {currentTab === "settings" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Panel 1: API Configuration */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-4 border border-border/50">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              🔑 Data API Credentials Management
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configure your API keys for market providers and intelligence networks. Credentials are saved securely.
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
                    <div className="relative flex items-center">
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
                        className="w-full text-xs bg-slate-900 border border-border outline-none px-3.5 py-2 rounded-xl font-mono text-slate-200 pr-10 focus:border-indigo-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }))}
                        className="absolute right-3 text-slate-500 hover:text-slate-300 text-xs"
                      >
                        {isVisible ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel 2: Risk Parameters & Limits */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-4 border border-border/50">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              ⚙️ Risk Parameters & Limits
            </h3>
            <p className="text-xs text-slate-400">
              Define maximum capital limits and position risk thresholds for local backtesting and portfolio optimization.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Daily Budget Limit ($)</label>
                <input
                  type="number"
                  value={limits.dailyBudget}
                  onChange={(e) =>
                    setLimits((prev) => ({
                      ...prev,
                      dailyBudget: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-slate-900 border border-border px-3.5 py-2 rounded-xl text-white text-xs font-mono font-bold focus:border-indigo-500/50 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Max Open Positions</label>
                <input
                  type="number"
                  value={limits.maxOpenPositions}
                  onChange={(e) =>
                    setLimits((prev) => ({
                      ...prev,
                      maxOpenPositions: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="w-full bg-slate-900 border border-border px-3.5 py-2 rounded-xl text-white text-xs font-mono font-bold focus:border-indigo-500/50 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end items-center gap-4 mt-4">
              {saveSettingsSuccess && (
                <span className="text-emerald-400 text-xs font-semibold animate-pulse">✓ Settings Saved Successfully!</span>
              )}
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="py-2.5 px-6 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md w-fit transition-all"
              >
                {savingSettings ? "Saving Settings..." : "Save Settings Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {manageTickersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass rounded-2xl flex flex-col max-h-[80vh] overflow-hidden border border-border/80 shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-border/50">
              <h3 className="text-lg font-bold text-white">
                {currentTab === "us" ? "Manage US Tickers" : currentTab === "crypto" ? "Manage Crypto Assets" : "Manage Active Tickers"}
              </h3>
              <button 
                onClick={() => setManageTickersOpen(false)}
                className="text-slate-400 hover:text-white px-2.5 py-1 bg-slate-900 border border-border/50 rounded-lg transition-all"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="bg-slate-950/40 p-4 border border-border/40 rounded-xl flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase font-mono">
                  {currentTab === "crypto" ? "Add Crypto Token" : "Add Stock Ticker"}
                </h4>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder={currentTab === "us" ? "e.g. AAPL, AMD" : currentTab === "crypto" ? "e.g. BTC, ADA" : "e.g. INFY, RELIANCE"}
                    value={newTickerInput}
                    onChange={(e) => setNewTickerInput(e.target.value)}
                    className="bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs font-mono font-bold uppercase"
                  />
                  {currentTab !== "crypto" && (
                    <input
                      type="text"
                      placeholder={currentTab === "us" ? "e.g. Advanced Micro Devices" : "e.g. Infosys Ltd"}
                      value={newTickerName}
                      onChange={(e) => setNewTickerName(e.target.value)}
                      className="bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs"
                    />
                  )}
                  <button
                    onClick={handleAddTicker}
                    disabled={addingTicker || !newTickerInput}
                    className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    {addingTicker ? "Adding..." : "Add Ticker"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase font-mono">
                  Active Watchlist ({(currentTab === "us" ? usStocks : currentTab === "crypto" ? cryptoAssets : stocks).length})
                </h4>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {(currentTab === "us" ? usStocks : currentTab === "crypto" ? cryptoAssets.map(a => ({ id: a.id, ticker: a.symbol, name: a.name })) : stocks).map((s) => (
                    <div key={s.id} className="flex justify-between items-center bg-slate-900/50 border border-border/40 p-2.5 rounded-xl hover:border-border transition-colors">
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-white font-mono">{s.ticker}</span>
                        <span className="text-[10px] text-slate-500">{s.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteTicker(s.ticker)}
                        className="text-rose-400 hover:text-rose-300 font-bold text-xs px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-4xl glass rounded-2xl flex flex-col max-h-[90vh] overflow-hidden border border-border/80 shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-white tracking-tight">{selectedTicker} Intel</h3>
                {detailData && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-900 border border-border text-slate-400 rounded">
                    {detailData.fundamentals.peRatio ? "Calculated Indicators" : "Stock Asset"}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSelectedTicker(null)}
                className="text-slate-400 hover:text-white px-2.5 py-1 bg-slate-900 border border-border/50 hover:border-border rounded-lg transition-all"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {loadingDetail ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-xs font-mono">Running local indicators calculation...</p>
                </div>
              ) : detailData ? (
                <div className="flex flex-col gap-6">
                  {detailData.rateLimitHit && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl p-3.5 text-xs flex flex-col gap-1.5 shadow-md">
                      <span className="font-bold flex items-center gap-1.5">
                        ⚠️ Alpha Vantage API Call Frequency Limit Hit
                      </span>
                      <span>
                        The free-tier rate quota has been exhausted or the ticker search triggered a rate limit. Displaying high-precision local model-simulated market candles and indicators.
                      </span>
                    </div>
                  )}

                  {/* Tabs Selector */}
                  <div className="flex gap-2 border-b border-border/30 pb-2">
                    {(["chart", "indicators", "fundamentals"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`text-xs uppercase font-bold px-4 py-1.5 rounded-lg border transition-all ${
                          activeTab === tab
                            ? "bg-indigo-500/20 text-white border-indigo-500/30"
                            : "text-slate-400 border-transparent hover:text-white"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Tab 1: Chart */}
                  {activeTab === "chart" && (
                    <div className="flex flex-col gap-4">
                      {/* Overlays selector */}
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>Technical Plot Overlays:</span>
                        {(["none", "bb", "rsi", "macd"] as const).map((overlay) => (
                          <button
                            key={overlay}
                            type="button"
                            onClick={() => setSelectedOverlay(overlay)}
                            className={`px-3 py-1 rounded border transition-all capitalize font-semibold ${
                              selectedOverlay === overlay
                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                : "bg-slate-900 border-border text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {overlay === "none" ? "Price Only" : overlay === "bb" ? "Bollinger Bands" : overlay.toUpperCase()}
                          </button>
                        ))}
                      </div>

                      {/* Main Chart Canvas */}
                      <div className="h-72 w-full bg-slate-950/40 p-4 rounded-xl border border-border/50">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart data={detailData.candles}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                            <XAxis dataKey="date" stroke="#475569" fontSize={10} />
                            <YAxis domain={["auto", "auto"]} stroke="#475569" fontSize={10} />
                            <ChartTooltip
                              contentStyle={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                              labelStyle={{ color: "#94a3b8" }}
                            />
                            {/* Base price line */}
                            <Line type="monotone" dataKey="close" stroke="#6366f1" strokeWidth={2} dot={false} name="Price" />
                            
                            {/* Bollinger Bands overlay */}
                            {selectedOverlay === "bb" && (
                              <>
                                <Line type="monotone" dataKey="bbUpper" stroke="#10b981" strokeDasharray="5 5" strokeWidth={1} dot={false} name="BB Upper" />
                                <Line type="monotone" dataKey="bbMiddle" stroke="#64748b" strokeWidth={1} dot={false} name="BB Middle" />
                                <Line type="monotone" dataKey="bbLower" stroke="#f43f5e" strokeDasharray="5 5" strokeWidth={1} dot={false} name="BB Lower" />
                              </>
                            )}

                            {/* RSI overlay */}
                            {selectedOverlay === "rsi" && (
                              <Line type="monotone" dataKey="rsi14" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="RSI (14)" />
                            )}

                            {/* MACD Line overlay */}
                            {selectedOverlay === "macd" && (
                              <>
                                <Line type="monotone" dataKey="macdLine" stroke="#eab308" strokeWidth={1.5} dot={false} name="MACD" />
                                <Line type="monotone" dataKey="macdSignal" stroke="#a855f7" strokeWidth={1} dot={false} name="Signal" />
                              </>
                            )}
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Indicators List */}
                  {activeTab === "indicators" && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead>
                          <tr className="border-b border-border/80 text-slate-500 font-bold">
                            <th className="py-2.5">Indicator</th>
                            <th className="py-2.5">Value</th>
                            <th className="py-2.5">Interpretation / State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 font-mono text-xs">
                          <tr>
                            <td className="py-3 font-semibold text-white">RSI (14)</td>
                            <td className="py-3">{detailData.latestIndicators.rsi?.toFixed(2) || "Calculating..."}</td>
                            <td className="py-3">
                              {detailData.latestIndicators.rsi !== null && detailData.latestIndicators.rsi > 70 ? (
                                <span className="text-rose-400 font-bold">Overbought (Sell Rating)</span>
                              ) : detailData.latestIndicators.rsi !== null && detailData.latestIndicators.rsi < 30 ? (
                                <span className="text-emerald-400 font-bold">Oversold (Buy Rating)</span>
                              ) : (
                                <span className="text-slate-400">Neutral Range</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 font-semibold text-white">MACD</td>
                            <td className="py-3">Line: {detailData.latestIndicators.macd?.toFixed(3) || "N/A"} / Signal: {detailData.latestIndicators.macdSignal?.toFixed(3) || "N/A"}</td>
                            <td className="py-3">
                              {detailData.latestIndicators.macdHist !== null && detailData.latestIndicators.macdHist > 0 ? (
                                <span className="text-emerald-400 font-bold">Bullish Momentum</span>
                              ) : (
                                <span className="text-rose-400">Bearish Momentum</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 font-semibold text-white">Bollinger Bands (20, 2)</td>
                            <td className="py-3">Upper: {selectedTicker?.toUpperCase().endsWith(".NS") || selectedTicker?.toUpperCase().endsWith(".BO") ? "₹" : "$"}{detailData.latestIndicators.bbUpper?.toFixed(2)} / Lower: {selectedTicker?.toUpperCase().endsWith(".NS") || selectedTicker?.toUpperCase().endsWith(".BO") ? "₹" : "$"}{detailData.latestIndicators.bbLower?.toFixed(2)}</td>
                            <td className="py-3">Standard deviation dispersion mapping.</td>
                          </tr>
                          <tr>
                            <td className="py-3 font-semibold text-white">Average True Range (14)</td>
                            <td className="py-3">{detailData.latestIndicators.atr?.toFixed(3)}</td>
                            <td className="py-3">Volatility tracking span.</td>
                          </tr>
                          <tr>
                            <td className="py-3 font-semibold text-white">On-Balance Volume (OBV)</td>
                            <td className="py-3">{detailData.latestIndicators.obv?.toLocaleString()}</td>
                            <td className="py-3">Volume pressure flow indicator.</td>
                          </tr>
                          <tr>
                            <td className="py-3 font-semibold text-white">Stochastic RSI</td>
                            <td className="py-3">%K: {detailData.latestIndicators.stochK?.toFixed(2)}% / %D: {detailData.latestIndicators.stochD?.toFixed(2)}%</td>
                            <td className="py-3">Stoch-filtered momentum mapping.</td>
                          </tr>
                          <tr>
                            <td className="py-3 font-semibold text-white">Volume Weighted Average Price (VWAP)</td>
                            <td className="py-3">{selectedTicker?.toUpperCase().endsWith(".NS") || selectedTicker?.toUpperCase().endsWith(".BO") ? "₹" : "$"}{detailData.latestIndicators.vwap?.toFixed(2)}</td>
                            <td className="py-3">Average typical cost weight line.</td>
                          </tr>
                          <tr>
                            <td className="py-3 font-semibold text-white">Volume Spike Detection</td>
                            <td className="py-3">{detailData.latestIndicators.isVolumeSpike ? "Detected" : "None"}</td>
                            <td className="py-3">
                              {detailData.latestIndicators.isVolumeSpike ? (
                                <span className="text-amber-400 font-bold animate-pulse">Unusual Activity Detected</span>
                              ) : (
                                <span className="text-slate-400">Standard Volume Levels</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tab 3: Fundamentals */}
                  {activeTab === "fundamentals" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[
                        { name: "P/E Ratio", value: detailData.fundamentals.peRatio?.toFixed(2) || "N/A" },
                        { name: "P/B Ratio", value: detailData.fundamentals.pbRatio?.toFixed(2) || "N/A" },
                        { name: "Eps (TTM)", value: detailData.fundamentals.eps ? `${selectedTicker?.toUpperCase().endsWith(".NS") || selectedTicker?.toUpperCase().endsWith(".BO") || selectedTicker?.toUpperCase() === "RELIANCE" || selectedTicker?.toUpperCase() === "INFY" || selectedTicker?.toUpperCase() === "TCS" ? "₹" : "$"}${detailData.fundamentals.eps.toFixed(2)}` : "N/A" },
                        { name: "Revenue Growth YoY", value: detailData.fundamentals.revenueGrowth ? `${(detailData.fundamentals.revenueGrowth * 100).toFixed(2)}%` : "N/A" },
                        { name: "Net Profit Margin YoY", value: detailData.fundamentals.netProfitGrowth ? `${(detailData.fundamentals.netProfitGrowth * 100).toFixed(2)}%` : "N/A" },
                        { name: "Debt to Equity Ratio", value: detailData.fundamentals.debtRatio ? `${detailData.fundamentals.debtRatio.toFixed(2)}%` : "N/A" },
                        { name: "Operating Cash Flow", value: detailData.fundamentals.cashFlow ? `${selectedTicker?.toUpperCase().endsWith(".NS") || selectedTicker?.toUpperCase().endsWith(".BO") || selectedTicker?.toUpperCase() === "RELIANCE" || selectedTicker?.toUpperCase() === "INFY" || selectedTicker?.toUpperCase() === "TCS" ? "₹" : "$"}${(detailData.fundamentals.cashFlow / 1e9).toFixed(2)}B` : "N/A" },
                        { name: "Return on Equity (ROE)", value: detailData.fundamentals.roe ? `${(detailData.fundamentals.roe * 100).toFixed(2)}%` : "N/A" },
                        { name: "Return on Assets (ROCE)", value: detailData.fundamentals.roce ? `${(detailData.fundamentals.roce * 100).toFixed(2)}%` : "N/A" },
                      ].map((item) => (
                        <div key={item.name} className="bg-slate-950/40 p-3 rounded-lg border border-border/50 flex flex-col justify-between min-h-[70px]">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">{item.name}</span>
                          <span className="text-sm font-mono font-bold text-white mt-1">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-rose-400">Failed to load detailed asset research.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating RAG Chat Widget Button */}
      <button
        onClick={() => {
          setChatOpen(!chatOpen);
          if (!chatOpen) {
            fetchChatSessions();
          }
        }}
        className="fixed bottom-6 right-6 z-50 p-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center cursor-pointer border border-indigo-400/30"
        title="RAG AI Assistant"
      >
        <MessageSquare className="w-6 h-6 animate-pulse" />
      </button>

      {/* Glassmorphic RAG Chat Console window */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-md h-[500px] glass border border-border/80 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-fade-in text-xs text-slate-300">
          
          {/* Console Header */}
          <div className="flex justify-between items-center bg-slate-950/60 p-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <div>
                <h4 className="font-bold text-white text-sm">Signal RAG Research AI</h4>
                <p className="text-[10px] text-slate-500">Explainable Local Vector KB Retrieval</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-slate-400 hover:text-white text-sm px-1.5 py-0.5 bg-slate-900 border border-border/50 hover:border-border rounded"
            >
              ✕ Close
            </button>
          </div>

          {/* Session Switcher dropdown and Create New Session button */}
          <div className="bg-slate-950/40 p-2.5 border-b border-border/40 flex items-center gap-2 justify-between">
            <div className="flex-1">
              <select
                value={chatSessionId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    handleSelectChatSession(val);
                  } else {
                    handleCreateNewChatSession();
                  }
                }}
                className="w-full bg-slate-900 border border-border/60 px-2.5 py-1 rounded text-white text-[10px]"
              >
                <option value="">-- Start New Thread --</option>
                {chatSessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.sessionName}</option>
                ))}
              </select>
            </div>
            
            {chatSessionId && (
              <button
                onClick={(e) => handleDeleteChatSession(chatSessionId, e)}
                className="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded hover:bg-rose-500/20 text-rose-400"
                title="Delete Session"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleCreateNewChatSession}
              className="px-2.5 py-1 bg-indigo-500 text-white font-bold text-[10px] rounded hover:bg-indigo-600 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          {/* Chat Messages scroll window */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-950/10">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 gap-2">
                <Cpu className="w-8 h-8 text-slate-700 animate-bounce" />
                <p className="font-semibold text-[11px] text-slate-400">Welcome to Signal RAG Chat</p>
                <p className="text-[10px] max-w-[240px] leading-relaxed">Ask about watchlist indicators, financial news sentiment index, or sports game odds predictions.</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div key={idx} className={`flex flex-col gap-1.5 max-w-[85%] ${
                    isUser ? "self-end items-end" : "self-start items-start"
                  }`}>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {isUser ? "You" : "Signal AI"} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                      isUser
                        ? "bg-indigo-500/20 text-indigo-100 border-indigo-500/30 rounded-tr-none"
                        : "bg-slate-900/60 text-slate-200 border-border/80 rounded-tl-none"
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Cite metadata */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 border-t border-border/30 pt-2 flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                            <span>Retrieved Citation Sources:</span>
                            <span className="text-indigo-400">Match Confidence: {Math.round((msg.confidence ?? 0) * 100)}%</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {msg.sources.map((src: RagSource, sIdx: number) => (
                              <a
                                key={sIdx}
                                href={src.url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-slate-950 border border-border/40 text-[8px] text-slate-400 px-1.5 py-0.5 rounded font-mono hover:text-white"
                              >
                                {src.source} ({src.date})
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {loadingChat && (
              <div className="self-start flex flex-col items-start gap-1">
                <span className="text-[9px] text-slate-500 font-mono">Signal AI is thinking...</span>
                <div className="bg-slate-900 border border-border/80 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Message input bar */}
          <div className="bg-slate-950/60 p-3 border-t border-border/60 flex items-center gap-2">
            <input
              type="text"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendChatMessage();
                }
              }}
              placeholder="Ask Signal RAG (e.g. latest Apple news...)"
              className="flex-1 bg-slate-900 border border-border px-3 py-2 rounded-xl text-white text-xs"
            />
            <button
              onClick={handleSendChatMessage}
              disabled={loadingChat || !chatQuestion.trim()}
              className="p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 text-white rounded-xl transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
