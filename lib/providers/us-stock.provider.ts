import { StockDataProvider } from "./stock.interface";
import { YahooFinanceProvider } from "./yahoo-finance.provider";
import { FinnhubProvider } from "./finnhub.provider";
import { AlphaVantageProvider } from "./alpha-vantage.provider";
import { config } from "../config";
import { logger } from "../logging";

export type USStockDataProvider = StockDataProvider;

export class YahooFinanceUSProvider extends YahooFinanceProvider implements USStockDataProvider {
  name = "Yahoo Finance US";
}

export class FinnhubUSProvider extends FinnhubProvider implements USStockDataProvider {
  name = "Finnhub US";
}

export class AlphaVantageUSProvider extends AlphaVantageProvider implements USStockDataProvider {
  name = "Alpha Vantage US";
}

export function getUSStockDataProvider(): USStockDataProvider {
  if (config.apiKeys.alphaVantage) {
    logger.api.info("Selecting Alpha Vantage US as active US stock provider");
    return new AlphaVantageUSProvider();
  }
  if (config.apiKeys.finnhub) {
    logger.api.info("Selecting Finnhub US as active US stock provider");
    return new FinnhubUSProvider();
  }
  logger.api.info("Selecting Yahoo Finance US as default keyless US stock provider");
  return new YahooFinanceUSProvider();
}
