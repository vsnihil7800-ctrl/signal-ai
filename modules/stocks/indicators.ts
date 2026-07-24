import { HistoricalQuote } from "../../lib/providers/stock.interface";

// 1. Simple Moving Average (SMA)
export function calculateSMA(values: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      sma.push(NaN); // Not enough data
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += values[i - j];
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

// 2. Exponential Moving Average (EMA)
export function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = [];
  if (values.length === 0) return ema;

  const k = 2 / (period + 1);
  let prevEma = 0;

  // Find initial value (first SMA)
  let initialSum = 0;
  for (let i = 0; i < period; i++) {
    if (i < values.length) {
      initialSum += values[i];
    }
  }
  const initialSma = initialSum / Math.min(period, values.length);

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      prevEma = initialSma;
      ema.push(initialSma);
    } else {
      const currentEma = values[i] * k + prevEma * (1 - k);
      ema.push(currentEma);
      prevEma = currentEma;
    }
  }
  return ema;
}

// 3. Relative Strength Index (RSI)
export function calculateRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  if (closes.length <= period) return Array(closes.length).fill(NaN);

  let avgGain = 0;
  let avgLoss = 0;

  // First RSI calculation
  let firstGainsSum = 0;
  let firstLossesSum = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) {
      firstGainsSum += diff;
    } else {
      firstLossesSum += Math.abs(diff);
    }
  }

  avgGain = firstGainsSum / period;
  avgLoss = firstLossesSum / period;

  // Fill up to the period
  for (let i = 0; i < period; i++) {
    rsi.push(NaN);
  }
  
  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + firstRS));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}

// 4. Moving Average Convergence Divergence (MACD)
export interface MACDResult {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
}

export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const fastEma = calculateEMA(closes, fastPeriod);
  const slowEma = calculateEMA(closes, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEma[i]) || isNaN(slowEma[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEma[i] - slowEma[i]);
    }
  }

  // Filter out NaNs for signal line calculation
  const validMacdStart = macdLine.findIndex((val) => !isNaN(val));
  let signalLine: number[] = Array(closes.length).fill(NaN);
  
  if (validMacdStart !== -1) {
    const validMacdPart = macdLine.slice(validMacdStart);
    const validSignalPart = calculateEMA(validMacdPart, signalPeriod);
    for (let i = 0; i < validSignalPart.length; i++) {
      signalLine[validMacdStart + i] = validSignalPart[i];
    }
  }

  const histogram: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(macdLine[i] - signalLine[i]);
    }
  }

  return { macdLine, signalLine, histogram };
}

// 5. Bollinger Bands (BB)
export interface BollingerBandsResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBandsResult {
  const middle = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (isNaN(middle[i])) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      // Calculate standard deviation in the window
      let sumSquares = 0;
      for (let j = 0; j < period; j++) {
        const diff = closes[i - j] - middle[i];
        sumSquares += diff * diff;
      }
      const stdDev = Math.sqrt(sumSquares / period);
      upper.push(middle[i] + stdDevMultiplier * stdDev);
      lower.push(middle[i] - stdDevMultiplier * stdDev);
    }
  }

  return { upper, middle, lower };
}

// 6. Average True Range (ATR)
export function calculateATR(candles: HistoricalQuote[], period: number = 14): number[] {
  const tr: number[] = [];
  if (candles.length === 0) return [];

  // Calculate True Range (TR)
  tr.push(candles[0].high - candles[0].low);
  for (let i = 1; i < candles.length; i++) {
    const highLow = candles[i].high - candles[i].low;
    const highPrevClose = Math.abs(candles[i].high - candles[i - 1].close);
    const lowPrevClose = Math.abs(candles[i].low - candles[i - 1].close);
    tr.push(Math.max(highLow, highPrevClose, lowPrevClose));
  }

  // ATR is the EMA of True Range
  return calculateEMA(tr, period);
}

// 7. On-Balance Volume (OBV)
export function calculateOBV(candles: HistoricalQuote[]): number[] {
  const obv: number[] = [];
  if (candles.length === 0) return obv;

  let currentObv = candles[0].volume;
  obv.push(currentObv);

  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) {
      currentObv += candles[i].volume;
    } else if (candles[i].close < candles[i - 1].close) {
      currentObv -= candles[i].volume;
    }
    obv.push(currentObv);
  }

  return obv;
}

// 8. Stochastic RSI
export interface StochasticRSIResult {
  stochK: number[];
  stochD: number[];
}

export function calculateStochasticRSI(
  closes: number[],
  period: number = 14,
  smoothK: number = 3,
  smoothD: number = 3
): StochasticRSIResult {
  const rsi = calculateRSI(closes, period);
  const stochRSI: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period * 2 - 1 || isNaN(rsi[i])) {
      stochRSI.push(NaN);
    } else {
      // Find min and max RSI in the current window of size 'period'
      let minRsi = rsi[i];
      let maxRsi = rsi[i];
      for (let j = 0; j < period; j++) {
        const val = rsi[i - j];
        if (val < minRsi) minRsi = val;
        if (val > maxRsi) maxRsi = val;
      }
      
      const rsiDiff = maxRsi - minRsi;
      if (rsiDiff === 0) {
        stochRSI.push(0.5); // Default neutral
      } else {
        stochRSI.push((rsi[i] - minRsi) / rsiDiff);
      }
    }
  }

  // Smooth K line using SMA
  const stochK = calculateSMA(stochRSI.map(v => isNaN(v) ? 0 : v), smoothK).map((v, idx) => isNaN(stochRSI[idx]) ? NaN : v * 100);
  
  // Smooth D line as SMA of K line
  const stochD = calculateSMA(stochK.map(v => isNaN(v) ? 0 : v), smoothD).map((v, idx) => isNaN(stochK[idx]) ? NaN : v);

  return { stochK, stochD };
}

// 9. Volume Weighted Average Price (VWAP)
// For daily candles, we approximate it since official intraday ticks are not available on free APIs.
export function calculateVWAP(candles: HistoricalQuote[]): number[] {
  const vwap: number[] = [];
  let cumulativeTypicalPriceVolume = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < candles.length; i++) {
    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
    cumulativeTypicalPriceVolume += typicalPrice * candles[i].volume;
    cumulativeVolume += candles[i].volume;

    if (cumulativeVolume === 0) {
      vwap.push(typicalPrice);
    } else {
      vwap.push(cumulativeTypicalPriceVolume / cumulativeVolume);
    }
  }

  return vwap;
}

// 10. Volume Spike Detection
export interface VolumeSpikeResult {
  isSpike: boolean[];
  averageVolume: number[];
}

export function detectVolumeSpikes(
  candles: HistoricalQuote[],
  period: number = 20,
  multiplier: number = 2
): VolumeSpikeResult {
  const volumes = candles.map((c) => c.volume);
  const averageVolume = calculateSMA(volumes, period);
  const isSpike: boolean[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (isNaN(averageVolume[i])) {
      isSpike.push(false);
    } else {
      isSpike.push(volumes[i] > averageVolume[i] * multiplier);
    }
  }

  return { isSpike, averageVolume };
}
