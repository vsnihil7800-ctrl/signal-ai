import YahooFinance from "yahoo-finance2";
import { StockDataProvider, StockQuote, HistoricalQuote, StockFundamentals } from "./stock.interface";
import { logger } from "../logging";

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

export class YahooFinanceProvider implements StockDataProvider {
  name = "Yahoo Finance";

  async getQuote(ticker: string): Promise<StockQuote> {
    try {
      logger.api.info(`Fetching quote for ${ticker} from Yahoo Finance`);
      const result = await yahooFinance.quote(ticker);
      if (!result) {
        throw new Error(`No quote found for ticker ${ticker}`);
      }

      return {
        ticker,
        price: result.regularMarketPrice ?? 0,
        change: result.regularMarketChange ?? 0,
        changePercent: result.regularMarketChangePercent ?? 0,
        high: result.regularMarketDayHigh ?? 0,
        low: result.regularMarketDayLow ?? 0,
        open: result.regularMarketOpen ?? 0,
        previousClose: result.regularMarketPreviousClose ?? 0,
        volume: result.regularMarketVolume ?? 0,
        lastUpdated: result.regularMarketTime ? new Date(result.regularMarketTime) : new Date(),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.api.error(`Yahoo Finance getQuote failed for ${ticker}: ${msg}`);
      throw error;
    }
  }

  async getHistoricalCandles(ticker: string, start: Date, end: Date): Promise<HistoricalQuote[]> {
    try {
      logger.api.info(`Fetching historical candles for ${ticker} from Yahoo Finance`);
      const queryOptions = {
        period1: Math.floor(start.getTime() / 1000),
        period2: Math.floor(end.getTime() / 1000),
        interval: "1d" as const,
      };
      
      const results = await yahooFinance.historical(ticker, queryOptions);
      if (!results || results.length === 0) {
        throw new Error(`No historical candles found for ticker ${ticker}`);
      }

      return results.map((r) => ({
        date: new Date(r.date),
        open: r.open ?? 0,
        high: r.high ?? 0,
        low: r.low ?? 0,
        close: r.close ?? 0,
        volume: r.volume ?? 0,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.api.error(`Yahoo Finance getHistoricalCandles failed for ${ticker}: ${msg}`);
      throw error;
    }
  }

  async getFundamentals(ticker: string): Promise<StockFundamentals> {
    try {
      logger.api.info(`Fetching fundamentals for ${ticker} from Yahoo Finance`);
      const summary = await yahooFinance.quoteSummary(ticker, {
        modules: ["summaryDetail", "defaultKeyStatistics", "financialData"],
      });

      if (!summary) {
        throw new Error(`No quoteSummary found for ticker ${ticker}`);
      }

      const summaryDetail = summary.summaryDetail;
      const defaultKeyStats = summary.defaultKeyStatistics;
      const financialData = summary.financialData;

      return {
        peRatio: summaryDetail?.trailingPE ?? null,
        pbRatio: defaultKeyStats?.priceToBook ?? null,
        eps: defaultKeyStats?.trailingEps ?? null,
        revenueGrowth: financialData?.revenueGrowth ?? null,
        netProfitGrowth: financialData?.earningsGrowth ?? null,
        debtRatio: financialData?.debtToEquity ?? null,
        cashFlow: financialData?.freeCashflow ?? null,
        roe: financialData?.returnOnEquity ?? null,
        roce: financialData?.returnOnAssets ?? null,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.api.error(`Yahoo Finance getFundamentals failed for ${ticker}: ${msg}`);
      throw error;
    }
  }
}
