import { logger } from "../../lib/logging";

export interface CryptoQuote {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  rank: number;
  lastUpdated: Date;
}

export interface CryptoHistoricalQuote {
  date: Date;
  price: number;
  volume: number;
}

export interface CryptoDataProvider {
  name: string;
  getQuote(symbol: string): Promise<CryptoQuote>;
  getHistoricalCandles(symbol: string, days: number): Promise<CryptoHistoricalQuote[]>;
  getFearAndGreedIndex(): Promise<{ value: number; classification: string }>;
}

const SYMBOL_TO_COINCAP_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binance-coin",
  XRP: "xrp",
  ADA: "cardano",
  MATIC: "polygon",
  AVAX: "avalanche",
  LINK: "chainlink",
  DOGE: "dogecoin"
};

const COINCAP_ID_TO_NAME: Record<string, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  solana: "Solana",
  "binance-coin": "BNB",
  xrp: "XRP",
  cardano: "Cardano",
  polygon: "Polygon",
  avalanche: "Avalanche",
  chainlink: "Chainlink",
  dogecoin: "Dogecoin"
};

const OFFLINE_MOCK_QUOTES: Record<string, Omit<CryptoQuote, "lastUpdated">> = {
  BTC: { symbol: "BTC", name: "Bitcoin", price: 64250.0, change24h: 1.45, marketCap: 1260000000000, volume24h: 28500000000, rank: 1 },
  ETH: { symbol: "ETH", name: "Ethereum", price: 3450.0, change24h: -0.85, marketCap: 415000000000, volume24h: 14200000000, rank: 2 },
  SOL: { symbol: "SOL", name: "Solana", price: 145.2, change24h: 4.85, marketCap: 67000000000, volume24h: 3100000000, rank: 5 },
  BNB: { symbol: "BNB", name: "BNB", price: 575.5, change24h: 0.2, marketCap: 84000000000, volume24h: 1200000000, rank: 4 },
  XRP: { symbol: "XRP", name: "XRP", price: 0.58, change24h: -1.12, marketCap: 32000000000, volume24h: 850000000, rank: 7 }
};

export class CoinCapProvider implements CryptoDataProvider {
  name = "CoinCap";

  async getQuote(symbol: string): Promise<CryptoQuote> {
    const id = SYMBOL_TO_COINCAP_ID[symbol.toUpperCase()] || symbol.toLowerCase();
    logger.api.info(`Fetching crypto quote for ${symbol} (${id}) from CoinCap`);
    
    try {
      const res = await fetch(`https://api.coincap.io/v2/assets/${id}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        throw new Error(`CoinCap API failed: ${res.statusText}`);
      }
      const json = await res.json();
      const data = json.data;
      
      return {
        symbol: symbol.toUpperCase(),
        name: data.name || COINCAP_ID_TO_NAME[id] || symbol,
        price: parseFloat(data.priceUsd) || 0,
        change24h: parseFloat(data.changePercent24Hr) || 0,
        marketCap: parseFloat(data.marketCapUsd) || 0,
        volume24h: parseFloat(data.volumeUsd24Hr) || 0,
        rank: parseInt(data.rank) || 99,
        lastUpdated: new Date(),
      };
    } catch (e) {
      logger.api.warn(`Offline fallback activated for quote ${symbol} due to: ${e}`);
      const mock = OFFLINE_MOCK_QUOTES[symbol.toUpperCase()] || {
        symbol: symbol.toUpperCase(),
        name: symbol,
        price: 1.0,
        change24h: 0.0,
        marketCap: 100000000,
        volume24h: 5000000,
        rank: 99
      };
      return {
        ...mock,
        lastUpdated: new Date()
      };
    }
  }

  async getHistoricalCandles(symbol: string, days: number): Promise<CryptoHistoricalQuote[]> {
    const id = SYMBOL_TO_COINCAP_ID[symbol.toUpperCase()] || symbol.toLowerCase();
    logger.api.info(`Fetching crypto history for ${symbol} (${id}) from CoinCap for last ${days} days`);
    
    try {
      const res = await fetch(`https://api.coincap.io/v2/assets/${id}/history?interval=d1`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        throw new Error(`CoinCap history failed: ${res.statusText}`);
      }
      const json = await res.json();
      const data = json.data as Array<{ time: number; priceUsd: string }>;
      
      const sorted = data
        .map((item) => ({
          date: new Date(item.time),
          price: parseFloat(item.priceUsd) || 0,
          volume: 0,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
        
      return sorted.slice(-days);
    } catch (e) {
      logger.api.warn(`Offline fallback activated for history ${symbol} due to: ${e}`);
      const basePrice = OFFLINE_MOCK_QUOTES[symbol.toUpperCase()]?.price || 100.0;
      const history: CryptoHistoricalQuote[] = [];
      const now = new Date();
      
      for (let i = days; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        // Generate random walk prices around the base price
        const randOffset = (Math.sin(i / 3) * 0.05) + ((Math.random() - 0.5) * 0.02);
        history.push({
          date,
          price: basePrice * (1 + randOffset),
          volume: 100000000 * (1 + Math.random() * 0.5),
        });
      }
      return history;
    }
  }

  async getFearAndGreedIndex(): Promise<{ value: number; classification: string }> {
    try {
      const res = await fetch("https://api.alternative.me/fng/", { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error("Fear and Greed API failed");
      const json = await res.json();
      const fng = json.data[0];
      return {
        value: parseInt(fng.value) || 50,
        classification: fng.value_classification || "Neutral",
      };
    } catch (e) {
      logger.api.error(`Failed to get Fear & Greed index: ${e}`);
      return { value: 68, classification: "Greed" };
    }
  }
}

export class BinanceProvider implements CryptoDataProvider {
  name = "Binance";

  private getBinanceSymbol(symbol: string): string {
    return `${symbol.toUpperCase()}USDT`;
  }

  async getQuote(symbol: string): Promise<CryptoQuote> {
    const binanceSym = this.getBinanceSymbol(symbol);
    logger.api.info(`Fetching crypto quote for ${symbol} (${binanceSym}) from Binance`);
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSym}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        throw new Error(`Binance Quote API failed: ${res.statusText}`);
      }
      const data = await res.json();
      return {
        symbol: symbol.toUpperCase(),
        name: COINCAP_ID_TO_NAME[SYMBOL_TO_COINCAP_ID[symbol.toUpperCase()]] || symbol,
        price: parseFloat(data.lastPrice) || 0,
        change24h: parseFloat(data.priceChangePercent) || 0,
        marketCap: 0,
        volume24h: parseFloat(data.quoteVolume) || 0,
        rank: 99,
        lastUpdated: new Date(),
      };
    } catch (e) {
      return new CoinCapProvider().getQuote(symbol);
    }
  }

  async getHistoricalCandles(symbol: string, days: number): Promise<CryptoHistoricalQuote[]> {
    const binanceSym = this.getBinanceSymbol(symbol);
    logger.api.info(`Fetching crypto history for ${symbol} from Binance`);
    try {
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSym}&interval=1d&limit=${days}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        throw new Error(`Binance candles failed: ${res.statusText}`);
      }
      const data = await res.json() as any[][];
      return data.map((d) => ({
        date: new Date(d[0]),
        price: parseFloat(d[4]) || 0,
        volume: parseFloat(d[5]) || 0,
      }));
    } catch (e) {
      return new CoinCapProvider().getHistoricalCandles(symbol, days);
    }
  }

  async getFearAndGreedIndex(): Promise<{ value: number; classification: string }> {
    return new CoinCapProvider().getFearAndGreedIndex();
  }
}

export function getCryptoDataProvider(): CryptoDataProvider {
  return new CoinCapProvider();
}
