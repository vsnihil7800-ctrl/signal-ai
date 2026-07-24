import { HistoricalQuote } from "../../lib/providers/stock.interface";
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD 
} from "./indicators";

export interface BacktestTrade {
  type: "BUY" | "SELL";
  date: string;
  price: number;
  shares: number;
  cashRemaining: number;
  valueAfterTrade: number;
}

export interface BacktestEquityPoint {
  date: string;
  strategyValue: number;
  benchmarkValue: number;
}

export interface BacktestResult {
  ticker: string;
  strategy: string;
  initialCapital: number;
  finalValue: number;
  benchmarkFinalValue: number;
  totalReturn: number;
  benchmarkReturn: number;
  cagr: number;
  benchmarkCagr: number;
  maxDrawdown: number;
  benchmarkMaxDrawdown: number;
  winRate: number;
  tradesCount: number;
  precision: number;
  recall: number;
  f1Score: number;
  equityCurve: BacktestEquityPoint[];
  trades: BacktestTrade[];
  dataSource?: string;
}

export class StockBacktester {
  run(
    ticker: string,
    candles: HistoricalQuote[],
    strategy: "rsi" | "macd" | "sma_cross",
    initialCapital: number
  ): BacktestResult {
    if (candles.length < 50) {
      throw new Error("Insufficient candle history to run backtest simulation");
    }

    const closes = candles.map((c) => c.close);
    const dates = candles.map((c) => c.date.toISOString().split("T")[0]);

    // Calculate indicators
    const rsi14 = calculateRSI(closes, 14);
    const { macdLine, signalLine } = calculateMACD(closes, 12, 26, 9);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);

    // Simulation variables
    let cash = initialCapital;
    let shares = 0;
    const trades: BacktestTrade[] = [];
    const equityCurve: BacktestEquityPoint[] = [];

    // Benchmark: Buy & Hold on Day 1
    const benchmarkInitialClose = candles[0].close;
    const benchmarkShares = initialCapital / benchmarkInitialClose;

    // Track classification items (True Positives, False Positives, False Negatives, True Negatives)
    // We evaluate predictions over a 5-day horizon
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;
    const holdPeriod = 5;

    // Simulation starts after enough indicators are primed (index 50)
    const startIdx = 50;

    for (let i = startIdx; i < candles.length; i++) {
      const price = candles[i].close;
      const date = dates[i];

      // Strategy signals check
      let buySignal = false;
      let sellSignal = false;

      if (strategy === "rsi") {
        // Buy when RSI crosses below 30
        buySignal = rsi14[i] < 30 && rsi14[i - 1] >= 30;
        // Sell when RSI crosses above 70
        sellSignal = rsi14[i] > 70 && rsi14[i - 1] <= 70;
      } else if (strategy === "macd") {
        // Buy on bullish MACD-Signal cross
        buySignal = macdLine[i] > signalLine[i] && macdLine[i - 1] <= signalLine[i - 1];
        // Sell on bearish cross
        sellSignal = macdLine[i] < signalLine[i] && macdLine[i - 1] >= signalLine[i - 1];
      } else if (strategy === "sma_cross") {
        // Buy on golden cross (SMA20 crosses above SMA50)
        buySignal = sma20[i] > sma50[i] && sma20[i - 1] <= sma50[i - 1];
        // Sell on death cross (SMA20 crosses below SMA50)
        sellSignal = sma20[i] < sma50[i] && sma20[i - 1] >= sma50[i - 1];
      }

      // Execute trades
      if (buySignal && cash > 0) {
        // Buy all-in
        shares = cash / price;
        cash = 0;
        trades.push({
          type: "BUY",
          date,
          price,
          shares,
          cashRemaining: cash,
          valueAfterTrade: shares * price,
        });
      } else if (sellSignal && shares > 0) {
        // Sell all-out
        cash = shares * price;
        trades.push({
          type: "SELL",
          date,
          price,
          shares,
          cashRemaining: cash,
          valueAfterTrade: cash,
        });
        shares = 0;
      }

      // 5-day horizon check for signal predictive calibration
      if (i + holdPeriod < candles.length) {
        const futurePrice = candles[i + holdPeriod].close;
        const priceIncreased = futurePrice > price;

        if (buySignal) {
          if (priceIncreased) tp++;
          else fp++;
        } else {
          if (priceIncreased) fn++;
          else tn++;
        }
      }

      // Equity tracking
      const strategyValue = cash + shares * price;
      const benchmarkValue = benchmarkShares * price;

      equityCurve.push({
        date,
        strategyValue,
        benchmarkValue,
      });
    }

    // Force sell at the end to calculate metrics
    const finalPrice = candles[candles.length - 1].close;
    const finalDate = dates[dates.length - 1];
    if (shares > 0) {
      cash = shares * finalPrice;
      trades.push({
        type: "SELL",
        date: finalDate,
        price: finalPrice,
        shares,
        cashRemaining: cash,
        valueAfterTrade: cash,
      });
      shares = 0;
    }

    const finalValue = cash;
    const benchmarkFinalValue = benchmarkShares * finalPrice;

    // CAGR & Ratios calculation
    const yearsElapsed = (candles.length - startIdx) / 252; // 252 trading days a year
    const cagr = Math.max(-0.999, Math.pow(finalValue / initialCapital, 1 / yearsElapsed) - 1);
    const benchmarkCagr = Math.max(-0.999, Math.pow(benchmarkFinalValue / initialCapital, 1 / yearsElapsed) - 1);

    // Max Drawdown calculation
    let maxDrawdown = 0;
    let peak = initialCapital;
    for (const point of equityCurve) {
      if (point.strategyValue > peak) peak = point.strategyValue;
      const drawdown = (peak - point.strategyValue) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    let benchmarkMaxDrawdown = 0;
    let benchmarkPeak = initialCapital;
    for (const point of equityCurve) {
      if (point.benchmarkValue > benchmarkPeak) benchmarkPeak = point.benchmarkValue;
      const drawdown = (benchmarkPeak - point.benchmarkValue) / benchmarkPeak;
      if (drawdown > benchmarkMaxDrawdown) benchmarkMaxDrawdown = drawdown;
    }

    // Win Rate (profitable trades / total trades)
    let winningTrades = 0;
    let completedTradesCount = 0;
    for (let t = 0; t < trades.length; t += 2) {
      if (t + 1 < trades.length) {
        completedTradesCount++;
        const buyTrade = trades[t];
        const sellTrade = trades[t + 1];
        if (sellTrade.price > buyTrade.price) {
          winningTrades++;
        }
      }
    }
    const winRate = completedTradesCount > 0 ? winningTrades / completedTradesCount : 0.5;

    // Precision, Recall, F1 calculations
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0.5;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0.5;
    const f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0.5;

    return {
      ticker,
      strategy,
      initialCapital,
      finalValue,
      benchmarkFinalValue,
      totalReturn: (finalValue - initialCapital) / initialCapital,
      benchmarkReturn: (benchmarkFinalValue - initialCapital) / initialCapital,
      cagr,
      benchmarkCagr,
      maxDrawdown,
      benchmarkMaxDrawdown,
      winRate,
      tradesCount: completedTradesCount,
      precision,
      recall,
      f1Score,
      equityCurve,
      trades,
    };
  }
}
export default StockBacktester;
