import { db } from "../../lib/db";
import { getStockDataProvider } from "../../lib/providers";
import { logger } from "../../lib/logging";
import { CoinCapProvider } from "../crypto/providers";

export interface AssetWeight {
  ticker: string;
  weight: number; // between 0 and 1
}

export interface FrontierPoint {
  volatility: number;
  expectedReturn: number;
}

export interface PortfolioOptimizationResult {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  riskScore: number;
  frontier: FrontierPoint[];
}

export class PortfolioOptimizer {
  private static RISK_FREE_RATE = 0.03; // 3% annualized

  // Annualizes daily variance/covariance (252 trading days)
  private static ANNUALIZATION_FACTOR = 252;

  async optimize(allocations: AssetWeight[]): Promise<PortfolioOptimizationResult> {
    if (allocations.length === 0) {
      throw new Error("Cannot optimize empty allocations");
    }

    const provider = getStockDataProvider();
    const tickers = allocations.map((a) => a.ticker);

    // Fetch 1 year of daily candles for each ticker
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    logger.api.info(`Fetching candles for portfolio tickers: ${tickers.join(", ")}`);

    const candlesMap = new Map<string, any[]>();
    for (const ticker of tickers) {
      const cryptoAsset = await db.cryptoAsset.findUnique({ where: { symbol: ticker } });
      if (cryptoAsset) {
        const cryptoProvider = new CoinCapProvider();
        const cryptoCandles = await cryptoProvider.getHistoricalCandles(ticker, 252);
        const mappedCandles = cryptoCandles.map((c) => ({
          date: c.date,
          open: c.price,
          high: c.price,
          low: c.price,
          close: c.price,
          volume: c.volume,
        }));
        candlesMap.set(ticker, mappedCandles);
      } else {
        const stock = await db.stock.findUnique({ where: { ticker } });
        let providerTicker = ticker;
        if (stock) {
          if (stock.exchange === "NSE") {
            providerTicker = `${ticker}.NS`;
          } else if (stock.exchange === "BSE") {
            providerTicker = `${ticker}.BO`;
          }
        }
        const candles = await provider.getHistoricalCandles(providerTicker, startDate, endDate);
        candlesMap.set(ticker, candles);
      }
    }

    // Align dates and calculate daily returns
    // Find common dates
    const datePricesMap = new Map<string, Map<string, number>>(); // date -> (ticker -> price)
    for (const [ticker, candles] of candlesMap.entries()) {
      for (const candle of candles) {
        const dateStr = new Date(candle.date).toISOString().split("T")[0];
        if (!datePricesMap.has(dateStr)) {
          datePricesMap.set(dateStr, new Map<string, number>());
        }
        datePricesMap.get(dateStr)!.set(ticker, candle.close);
      }
    }

    // Filter dates where all tickers have price data
    const sortedDates = Array.from(datePricesMap.keys())
      .filter((dateStr) => {
        const prices = datePricesMap.get(dateStr)!;
        return tickers.every((t) => prices.has(t));
      })
      .sort();

    if (sortedDates.length < 5) {
      throw new Error("Insufficient overlapping historical trading data for selected tickers");
    }

    logger.api.info(`Aligned portfolio returns across ${sortedDates.length} trading days`);

    // Calculate daily returns stream for each asset
    const dailyReturns = new Map<string, number[]>();
    for (const ticker of tickers) {
      dailyReturns.set(ticker, []);
    }

    for (let t = 1; t < sortedDates.length; t++) {
      const prevPrices = datePricesMap.get(sortedDates[t - 1])!;
      const currPrices = datePricesMap.get(sortedDates[t])!;

      for (const ticker of tickers) {
        const prev = prevPrices.get(ticker)!;
        const curr = currPrices.get(ticker)!;
        const ret = (curr - prev) / prev;
        dailyReturns.get(ticker)!.push(ret);
      }
    }

    const numReturns = sortedDates.length - 1;

    // Calculate annualized expected returns (means)
    const expectedReturns = new Map<string, number>();
    for (const ticker of tickers) {
      const rets = dailyReturns.get(ticker)!;
      const avgDaily = rets.reduce((sum, val) => sum + val, 0) / numReturns;
      const annualized = avgDaily * PortfolioOptimizer.ANNUALIZATION_FACTOR;
      expectedReturns.set(ticker, annualized);
    }

    // Calculate covariance matrix
    const covarianceMatrix = new Map<string, Map<string, number>>();
    for (const t1 of tickers) {
      covarianceMatrix.set(t1, new Map<string, number>());
      const r1 = dailyReturns.get(t1)!;
      const m1 = expectedReturns.get(t1)! / PortfolioOptimizer.ANNUALIZATION_FACTOR;

      for (const t2 of tickers) {
        const r2 = dailyReturns.get(t2)!;
        const m2 = expectedReturns.get(t2)! / PortfolioOptimizer.ANNUALIZATION_FACTOR;

        let covSum = 0;
        for (let i = 0; i < numReturns; i++) {
          covSum += (r1[i] - m1) * (r2[i] - m2);
        }
        const dailyCov = covSum / (numReturns - 1);
        const annualizedCov = dailyCov * PortfolioOptimizer.ANNUALIZATION_FACTOR;
        covarianceMatrix.get(t1)!.set(t2, annualizedCov);
      }
    }

    // 1. Calculate stats for the user-selected allocation weights
    const userPortfolio = this.calculateMetrics(allocations, expectedReturns, covarianceMatrix);

    // 2. Run Monte Carlo simulation to generate MPT Efficient Frontier points
    const frontier: FrontierPoint[] = [];
    const numSimulations = 100;

    for (let s = 0; s < numSimulations; s++) {
      // Generate random weights that sum to 1.0
      const randomWeightsRaw = tickers.map(() => Math.random());
      const sumWeights = randomWeightsRaw.reduce((sum, w) => sum + w, 0);
      const randomAllocations: AssetWeight[] = allocations.map((a, i) => ({
        ticker: a.ticker,
        weight: randomWeightsRaw[i] / sumWeights,
      }));

      const simMetrics = this.calculateMetrics(randomAllocations, expectedReturns, covarianceMatrix);
      frontier.push({
        volatility: simMetrics.volatility,
        expectedReturn: simMetrics.expectedReturn,
      });
    }

    // Sort frontier by volatility for visual rendering alignment
    frontier.sort((a, b) => a.volatility - b.volatility);

    return {
      expectedReturn: userPortfolio.expectedReturn,
      volatility: userPortfolio.volatility,
      sharpeRatio: userPortfolio.sharpeRatio,
      riskScore: userPortfolio.riskScore,
      frontier,
    };
  }

  private calculateMetrics(
    allocations: AssetWeight[],
    expectedReturns: Map<string, number>,
    covarianceMatrix: Map<string, Map<string, number>>
  ): { expectedReturn: number; volatility: number; sharpeRatio: number; riskScore: number } {
    // Expected return: sum(w_i * R_i)
    let pReturn = 0;
    for (const a of allocations) {
      const assetRet = expectedReturns.get(a.ticker) ?? 0;
      pReturn += a.weight * assetRet;
    }

    // Volatility: sqrt(w^T * Sigma * w)
    let pVariance = 0;
    for (const a1 of allocations) {
      for (const a2 of allocations) {
        const cov = covarianceMatrix.get(a1.ticker)?.get(a2.ticker) ?? 0;
        pVariance += a1.weight * a2.weight * cov;
      }
    }
    // Prevent negative variance errors
    const pVolatility = Math.sqrt(Math.max(0, pVariance));

    // Sharpe: (R_p - R_f) / Vol_p
    const sharpe = pVolatility > 0 ? (pReturn - PortfolioOptimizer.RISK_FREE_RATE) / pVolatility : 0;

    // Risk Score: bounded scale 1-10 mapping volatility
    // Vol <= 8% -> Risk 1-2, Vol >= 35% -> Risk 9-10
    let riskScore = 1;
    if (pVolatility > 0.05) {
      riskScore = Math.min(10, Math.round(pVolatility * 25));
    }
    riskScore = Math.max(1, riskScore);

    return {
      expectedReturn: pReturn,
      volatility: pVolatility,
      sharpeRatio: sharpe,
      riskScore,
    };
  }
}
export default PortfolioOptimizer;
