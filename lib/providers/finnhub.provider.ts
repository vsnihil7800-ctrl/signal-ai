import { StockDataProvider, StockQuote, HistoricalQuote, StockFundamentals } from "./stock.interface";
import { config } from "../config";
import { logger } from "../logging";
import { checkAndIncrementUsage } from "./usage-tracker";

export class FinnhubProvider implements StockDataProvider {
  name = "Finnhub";
  private apiKey: string;

  constructor() {
    this.apiKey = config.apiKeys.finnhub || "";
  }

  async getQuote(ticker: string): Promise<StockQuote> {
    if (!this.apiKey) {
      throw new Error("Finnhub API key is not configured");
    }

    await checkAndIncrementUsage("Finnhub", "QUOTE");

    logger.api.info(`Fetching quote for ${ticker} from Finnhub API`);
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub quote fetch failed: status ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.c === 0) {
      throw new Error(`Finnhub returned empty quote for ticker ${ticker}`);
    }

    return {
      ticker,
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      volume: 0, // Finnhub quote does not provide volume in the basic endpoint
      lastUpdated: data.t ? new Date(data.t * 1000) : new Date(),
    };
  }

  async getHistoricalCandles(ticker: string, start: Date, end: Date): Promise<HistoricalQuote[]> {
    if (!this.apiKey) {
      throw new Error("Finnhub API key is not configured");
    }

    await checkAndIncrementUsage("Finnhub", "CANDLES");

    logger.api.info(`Fetching historical candles for ${ticker} from Finnhub API`);
    const from = Math.floor(start.getTime() / 1000);
    const to = Math.floor(end.getTime() / 1000);

    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub candles fetch failed: status ${response.status}`);
    }

    const data = await response.json();
    if (data.s !== "ok" || !data.t) {
      throw new Error(`Finnhub candles return status: ${data.s || "unknown"}`);
    }

    const candles: HistoricalQuote[] = [];
    for (let i = 0; i < data.t.length; i++) {
      candles.push({
        date: new Date(data.t[i] * 1000),
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i],
      });
    }

    return candles;
  }

  async getFundamentals(ticker: string): Promise<StockFundamentals> {
    if (!this.apiKey) {
      throw new Error("Finnhub API key is not configured");
    }

    await checkAndIncrementUsage("Finnhub", "METRICS");

    logger.api.info(`Fetching fundamentals for ${ticker} from Finnhub API`);
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub fundamentals fetch failed: status ${response.status}`);
    }

    const data = await response.json();
    const metrics = data.metric || {};

    return {
      peRatio: metrics.peNormalizedAnnual ?? metrics.peBasicShare ?? null,
      pbRatio: metrics.pbAnnual ?? null,
      eps: metrics.epsBasicExclExtraItemsAnnual ?? null,
      revenueGrowth: metrics.revenueGrowth3Y ?? null,
      netProfitGrowth: metrics.netProfitMarginAnnual ?? null,
      debtRatio: metrics.debtEquityTTM ?? null,
      cashFlow: metrics.freeCashFlowAnnual ?? null,
      roe: metrics.roeTTM ?? null,
      roce: metrics.roceTTM ?? null,
    };
  }
}
export default FinnhubProvider;
