import { getStockDataProvider } from "../lib/providers";
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD, 
  calculateBollingerBands, 
  calculateATR, 
  calculateOBV, 
  calculateStochasticRSI, 
  calculateVWAP, 
  detectVolumeSpikes 
} from "../modules/stocks/indicators";

async function run() {
  console.log("🧪 Starting technical indicators mathematical verification script...");
  
  const provider = getStockDataProvider();
  console.log(`Active Provider: ${provider.name}`);

  const ticker = "AAPL";
  console.log(`\nFetching 100 daily candles for: ${ticker}`);
  
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 120); // fetch plenty of history to resolve index gaps

  const candles = await provider.getHistoricalCandles(ticker, start, end);
  console.log(`Fetched ${candles.length} candles successfully.`);

  if (candles.length < 50) {
    throw new Error("Insufficient candles retrieved to perform calculations");
  }

  const closes = candles.map((c) => c.close);

  // 1. SMA (20)
  const sma20 = calculateSMA(closes, 20);
  console.log(`- SMA (20) [Latest]: $${sma20[sma20.length - 1]?.toFixed(2)} (Values array size: ${sma20.length})`);

  // 2. EMA (20)
  const ema20 = calculateEMA(closes, 20);
  console.log(`- EMA (20) [Latest]: $${ema20[ema20.length - 1]?.toFixed(2)}`);

  // 3. RSI (14)
  const rsi14 = calculateRSI(closes, 14);
  console.log(`- RSI (14) [Latest]: ${rsi14[rsi14.length - 1]?.toFixed(2)}`);

  // 4. MACD (12, 26, 9)
  const { macdLine, signalLine, histogram } = calculateMACD(closes, 12, 26, 9);
  console.log(`- MACD Line [Latest]: ${macdLine[macdLine.length - 1]?.toFixed(4)}`);
  console.log(`- MACD Signal Line [Latest]: ${signalLine[signalLine.length - 1]?.toFixed(4)}`);
  console.log(`- MACD Histogram [Latest]: ${histogram[histogram.length - 1]?.toFixed(4)}`);

  // 5. Bollinger Bands (20, 2)
  const { upper, middle, lower } = calculateBollingerBands(closes, 20, 2);
  console.log(`- Bollinger Upper [Latest]: $${upper[upper.length - 1]?.toFixed(2)}`);
  console.log(`- Bollinger Middle [Latest]: $${middle[middle.length - 1]?.toFixed(2)}`);
  console.log(`- Bollinger Lower [Latest]: $${lower[lower.length - 1]?.toFixed(2)}`);

  // 6. ATR (14)
  const atr14 = calculateATR(candles, 14);
  console.log(`- ATR (14) [Latest]: $${atr14[atr14.length - 1]?.toFixed(3)}`);

  // 7. OBV
  const obv = calculateOBV(candles);
  console.log(`- OBV [Latest]: ${obv[obv.length - 1]?.toLocaleString()}`);

  // 8. Stochastic RSI
  const { stochK, stochD } = calculateStochasticRSI(closes, 14, 3, 3);
  console.log(`- Stochastic %K [Latest]: ${stochK[stochK.length - 1]?.toFixed(2)}%`);
  console.log(`- Stochastic %D [Latest]: ${stochD[stochD.length - 1]?.toFixed(2)}%`);

  // 9. VWAP
  const vwap = calculateVWAP(candles);
  console.log(`- VWAP [Latest]: $${vwap[vwap.length - 1]?.toFixed(2)}`);

  // 10. Volume Spike Detection
  const { isSpike, averageVolume } = detectVolumeSpikes(candles, 20, 2);
  console.log(`- Volume Spike Detected [Latest]: ${isSpike[isSpike.length - 1]}`);
  console.log(`- Average Volume (20) [Latest]: ${Math.round(averageVolume[averageVolume.length - 1] || 0).toLocaleString()}`);

  console.log("\n✅ All 10 indicators computed locally with success.");
}

run().catch((err) => {
  console.error("❌ Indicators mathematical test failed:", err);
});
export default run;
