import { StockDataProvider } from "./stock.interface";
import { YahooFinanceProvider } from "./yahoo-finance.provider";
import { FinnhubProvider } from "./finnhub.provider";
import { AlphaVantageProvider } from "./alpha-vantage.provider";
import { config } from "../config";
import { logger } from "../logging";

export function getStockDataProvider(): StockDataProvider {
  if (config.apiKeys.alphaVantage) {
    logger.api.info("Selecting Alpha Vantage as active stock data provider");
    return new AlphaVantageProvider();
  }
  if (config.apiKeys.finnhub) {
    logger.api.info("Selecting Finnhub as active stock data provider");
    return new FinnhubProvider();
  }
  logger.api.info("Selecting Yahoo Finance as default stock data provider (keyless)");
  return new YahooFinanceProvider();
}

export * from "./stock.interface";
export * from "./yahoo-finance.provider";
export * from "./finnhub.provider";
export * from "./alpha-vantage.provider";
export * from "./us-stock.provider";
export * from "./usage-tracker";
