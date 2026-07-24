import { CryptoHistoricalQuote } from "./providers";

export interface FibonacciLevels {
  level0: number;    // High (0.0%)
  level236: number;  // 23.6%
  level382: number;  // 38.2%
  level500: number;  // 50.0%
  level618: number;  // 61.8%
  level786: number;  // 78.6%
  level100: number;  // Low (100.0%)
}

export interface SupportResistance {
  resistances: number[];
  supports: number[];
  pivotPoint: number;
}

export interface CryptoIndicatorsResult {
  sma20: number;
  ema12: number;
  ema26: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  fibonacci: FibonacciLevels;
  sr: SupportResistance;
}

export class CryptoIndicatorsEngine {
  calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const sum = prices.slice(-period).reduce((acc, p) => acc + p, 0);
    return sum / period;
  }

  calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    let ema = prices[0];
    const k = 2 / (period + 1);
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
  }

  calculateRSI(prices: number[], period = 14): number {
    if (prices.length <= period) return 50;
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  calculateMACD(prices: number[]): { macd: number; signal: number } {
    const ema12 = this.calculateEMASeries(prices, 12);
    const ema26 = this.calculateEMASeries(prices, 26);
    const macdLine: number[] = [];
    
    for (let i = 0; i < prices.length; i++) {
      macdLine.push(ema12[i] - ema26[i]);
    }
    
    const signalLine = this.calculateEMASeries(macdLine, 9);
    return {
      macd: macdLine[macdLine.length - 1] || 0,
      signal: signalLine[signalLine.length - 1] || 0,
    };
  }

  private calculateEMASeries(prices: number[], period: number): number[] {
    const ema: number[] = [];
    if (prices.length === 0) return [];
    ema.push(prices[0]);
    const k = 2 / (period + 1);
    for (let i = 1; i < prices.length; i++) {
      ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  }

  calculateBollingerBands(prices: number[], period = 20, multiplier = 2): { upper: number; middle: number; lower: number } {
    const middle = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);
    const mean = middle;
    const sqDiffSum = slice.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0);
    const stdDev = Math.sqrt(sqDiffSum / period);
    return {
      upper: middle + multiplier * stdDev,
      middle,
      lower: middle - multiplier * stdDev,
    };
  }

  calculateFibonacci(high: number, low: number): FibonacciLevels {
    const diff = high - low;
    return {
      level0: high,
      level236: high - 0.236 * diff,
      level382: high - 0.382 * diff,
      level500: high - 0.5 * diff,
      level618: high - 0.618 * diff,
      level786: high - 0.786 * diff,
      level100: low,
    };
  }

  calculateSupportResistance(prices: number[]): SupportResistance {
    if (prices.length < 5) {
      return { resistances: [], supports: [], pivotPoint: 0 };
    }
    
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const close = prices[prices.length - 1];
    
    // Standard Pivot Point Calculations
    const pivotPoint = (high + low + close) / 3;
    const r1 = 2 * pivotPoint - low;
    const s1 = 2 * pivotPoint - high;
    const r2 = pivotPoint + (high - low);
    const s2 = pivotPoint - (high - low);

    return {
      resistances: [r1, r2],
      supports: [s1, s2],
      pivotPoint,
    };
  }

  compute(history: CryptoHistoricalQuote[]): CryptoIndicatorsResult {
    const prices = history.map((h) => h.price);
    const high = Math.max(...prices);
    const low = Math.min(...prices);

    const macdResult = this.calculateMACD(prices);
    const bb = this.calculateBollingerBands(prices);

    return {
      sma20: this.calculateSMA(prices, 20),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
      rsi: this.calculateRSI(prices),
      macd: macdResult.macd,
      macdSignal: macdResult.signal,
      bbUpper: bb.upper,
      bbMiddle: bb.middle,
      bbLower: bb.lower,
      fibonacci: this.calculateFibonacci(high, low),
      sr: this.calculateSupportResistance(prices),
    };
  }
}
export default CryptoIndicatorsEngine;
