export interface HistoricalQuote {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  lastUpdated: Date;
}

export interface StockFundamentals {
  peRatio: number | null;
  pbRatio: number | null;
  eps: number | null;
  revenueGrowth: number | null;
  netProfitGrowth: number | null;
  debtRatio: number | null;
  cashFlow: number | null;
  roe: number | null;
  roce: number | null;
}

export interface StockDataProvider {
  name: string;
  getQuote(ticker: string): Promise<StockQuote>;
  getHistoricalCandles(ticker: string, start: Date, end: Date): Promise<HistoricalQuote[]>;
  getFundamentals(ticker: string): Promise<StockFundamentals>;
}
