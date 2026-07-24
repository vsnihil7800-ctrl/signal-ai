import { StockDataProvider, StockQuote, HistoricalQuote, StockFundamentals } from "./stock.interface";
import { config } from "../config";
import { logger } from "../logging";
import { checkAndIncrementUsage } from "./usage-tracker";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const quoteCache = new Map<string, CacheEntry<StockQuote>>();
const candlesCache = new Map<string, CacheEntry<HistoricalQuote[]>>();
const fundamentalsCache = new Map<string, CacheEntry<StockFundamentals>>();

const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

export class AlphaVantageProvider implements StockDataProvider {
  name = "Alpha Vantage";
  private apiKey: string;

  constructor() {
    this.apiKey = config.apiKeys.alphaVantage || "";
  }

  async getQuote(ticker: string): Promise<StockQuote> {
    if (!this.apiKey) {
      throw new Error("Alpha Vantage API key is not configured");
    }

    const symbol = ticker.replace(".NS", ".NSE");
    const cached = quoteCache.get(symbol);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      logger.api.info(`Returning cached quote for ${ticker} from Alpha Vantage`);
      return cached.data;
    }

    await checkAndIncrementUsage("AlphaVantage", "GLOBAL_QUOTE");

    logger.api.info(`Fetching quote for ${ticker} from Alpha Vantage`);
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Alpha Vantage quote fetch failed: status ${response.status}`);
    }

    const data = await response.json();
    
    // Check if limit note returned
    if (data["Note"] && data["Note"].includes("frequency")) {
      throw new Error("Alpha Vantage API call rate limit hit (Note).");
    }

    const quoteData = data["Global Quote"];
    if (!quoteData || !quoteData["05. price"]) {
      throw new Error(
        `Alpha Vantage return invalid structure or limit hit. Response: ${JSON.stringify(data)}`
      );
    }

    const result = {
      ticker,
      price: parseFloat(quoteData["05. price"]) || 0,
      change: parseFloat(quoteData["09. change"]) || 0,
      changePercent: parseFloat(quoteData["10. change percent"].replace("%", "")) || 0,
      high: parseFloat(quoteData["03. high"]) || 0,
      low: parseFloat(quoteData["04. low"]) || 0,
      open: parseFloat(quoteData["02. open"]) || 0,
      previousClose: parseFloat(quoteData["08. previous close"]) || 0,
      volume: parseInt(quoteData["06. volume"], 10) || 0,
      lastUpdated: new Date(),
    };

    quoteCache.set(symbol, { data: result, timestamp: Date.now() });
    return result;
  }

  async getHistoricalCandles(ticker: string, start: Date, end: Date): Promise<HistoricalQuote[]> {
    if (!this.apiKey) {
      throw new Error("Alpha Vantage API key is not configured");
    }

    const symbol = ticker.replace(".NS", ".NSE");
    const cached = candlesCache.get(symbol);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      logger.api.info(`Returning cached historical candles for ${ticker} from Alpha Vantage`);
      return cached.data;
    }

    await checkAndIncrementUsage("AlphaVantage", "TIME_SERIES_DAILY");

    const daysLimit = Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
    const outputsize = daysLimit > 90 ? "full" : "compact";

    logger.api.info(`Fetching historical candles for ${ticker} from Alpha Vantage (outputsize: ${outputsize})`);
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputsize}&apikey=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Alpha Vantage candles fetch failed: status ${response.status}`);
    }

    const data = await response.json();
    
    // Check if limit note returned
    if (data["Note"] && data["Note"].includes("frequency")) {
      throw new Error("Alpha Vantage API call rate limit hit (Note).");
    }

    const timeSeries = data["Time Series (Daily)"];
    if (!timeSeries) {
      throw new Error(
        `Alpha Vantage return invalid structure or limit hit. Response: ${JSON.stringify(data)}`
      );
    }

    const candles: HistoricalQuote[] = [];
    const startDateMs = start.getTime();
    const endDateMs = end.getTime();

    for (const [dateStr, values] of Object.entries(timeSeries)) {
      const date = new Date(dateStr);
      const dateMs = date.getTime();
      
      if (dateMs >= startDateMs && dateMs <= endDateMs) {
        const val = values as Record<string, string>;
        candles.push({
          date,
          open: parseFloat(val["1. open"]) || 0,
          high: parseFloat(val["2. high"]) || 0,
          low: parseFloat(val["3. low"]) || 0,
          close: parseFloat(val["4. close"]) || 0,
          volume: parseInt(val["5. volume"], 10) || 0,
        });
      }
    }

    const sortedCandles = candles.sort((a, b) => a.date.getTime() - b.date.getTime());
    candlesCache.set(symbol, { data: sortedCandles, timestamp: Date.now() });
    return sortedCandles;
  }

  async getFundamentals(ticker: string): Promise<StockFundamentals> {
    if (!this.apiKey) {
      throw new Error("Alpha Vantage API key is not configured");
    }

    const symbol = ticker.replace(".NS", ".NSE");
    const cached = fundamentalsCache.get(symbol);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      logger.api.info(`Returning cached fundamentals for ${ticker} from Alpha Vantage`);
      return cached.data;
    }

    await checkAndIncrementUsage("AlphaVantage", "OVERVIEW");

    logger.api.info(`Fetching fundamentals for ${ticker} from Alpha Vantage`);
    const response = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Alpha Vantage fundamentals fetch failed: status ${response.status}`);
    }

    const data = await response.json();
    
    // Check if limit note returned
    if (data["Note"] && data["Note"].includes("frequency")) {
      throw new Error("Alpha Vantage API call rate limit hit (Note).");
    }

    if (!data || !data.Symbol) {
      throw new Error(`Alpha Vantage returned invalid overview response: ${JSON.stringify(data)}`);
    }

    const result = {
      peRatio: parseFloat(data.PERatio) || null,
      pbRatio: parseFloat(data.PriceToBookRatio) || null,
      eps: parseFloat(data.DilutedEPSTTM) || null,
      revenueGrowth: parseFloat(data.QuarterlyRevenueGrowthYOY) || null,
      netProfitGrowth: parseFloat(data.QuarterlyEarningsGrowthYOY) || null,
      debtRatio: parseFloat(data.PercentDebtToEquity) || null,
      cashFlow: parseFloat(data.OperatingCashFlow) || null,
      roe: parseFloat(data.ReturnOnEquityTTM) || null,
      roce: parseFloat(data.ReturnOnAssetsTTM) || null,
    };

    fundamentalsCache.set(symbol, { data: result, timestamp: Date.now() });
    return result;
  }
}
export default AlphaVantageProvider;
