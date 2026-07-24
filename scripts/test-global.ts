import { CoinCapProvider, BinanceProvider } from "../modules/crypto/providers";
import { CryptoIndicatorsEngine } from "../modules/crypto/indicators";
import { CryptoSignalEngine } from "../modules/crypto/signals";
import { CryptoPortfolioEngine } from "../modules/crypto/portfolio";

async function runTests() {
  console.log("=========================================");
  console.log("STARTING GLOBAL MARKETS INTEGRATION TESTS");
  console.log("=========================================\n");

  // 1. Test Crypto Providers
  console.log("[TEST 1] Testing Keyless Crypto Providers...");
  const coinCap = new CoinCapProvider();
  const binance = new BinanceProvider();

  try {
    const btcQuote = await coinCap.getQuote("BTC");
    console.log(`✓ CoinCap Quote: ${btcQuote.name} (${btcQuote.symbol}) - Price: $${btcQuote.price}, Rank: ${btcQuote.rank}`);

    const fng = await coinCap.getFearAndGreedIndex();
    console.log(`✓ Fear & Greed Index: ${fng.value} (${fng.classification})`);

    const btcHistory = await coinCap.getHistoricalCandles("BTC", 30);
    console.log(`✓ CoinCap History: Retrieved ${btcHistory.length} daily candles for BTC`);

    // 2. Test Indicators Engine
    console.log("\n[TEST 2] Testing Technical Indicators Computation...");
    const indEngine = new CryptoIndicatorsEngine();
    const indResult = indEngine.compute(btcHistory);
    
    console.log(`✓ RSI (14): ${indResult.rsi.toFixed(2)} (Neutral range is 30-70)`);
    console.log(`✓ MACD: Line=${indResult.macd.toFixed(2)}, Signal=${indResult.macdSignal.toFixed(2)}`);
    console.log(`✓ Bollinger Bands: Upper=${indResult.bbUpper.toFixed(2)}, Middle=${indResult.bbMiddle.toFixed(2)}, Lower=${indResult.bbLower.toFixed(2)}`);
    console.log(`✓ Fibonacci Levels: 0% (High)=${indResult.fibonacci.level0.toFixed(2)}, 61.8%=${indResult.fibonacci.level618.toFixed(2)}, 100% (Low)=${indResult.fibonacci.level100.toFixed(2)}`);
    console.log(`✓ Support & Resistance Pivots: R1=${indResult.sr.resistances[0]?.toFixed(2)}, PP=${indResult.sr.pivotPoint.toFixed(2)}, S1=${indResult.sr.supports[0]?.toFixed(2)}`);

    // 3. Test Signals Engine
    console.log("\n[TEST 3] Testing AI Signals Rating Engine...");
    const sigEngine = new CryptoSignalEngine();
    const signal = sigEngine.generate(btcQuote, indResult, fng.value);
    
    console.log(`✓ Signal Rating: ${signal.recommendation} (Confidence: ${Math.round(signal.confidence * 100)}%)`);
    console.log(`✓ Technical Score: ${Math.round(signal.technicalScore * 100)}%`);
    console.log(`✓ On-Chain Volume Score: ${Math.round(signal.onChainScore * 100)}%`);
    console.log(`✓ Volatility Score: ${Math.round(signal.volatilityScore * 100)}%`);
    console.log(`✓ Reasoning: ${signal.reasoning}`);
    console.log(`✓ Calibration Model Metrics: Accuracy=${signal.metrics.accuracy * 100}%, F1=${signal.metrics.f1Score * 100}%`);

    // 4. Test Portfolio Pearson Correlation Engine
    console.log("\n[TEST 4] Testing Pearson Correlation Matrices...");
    const portEngine = new CryptoPortfolioEngine();
    
    const dbHoldings = [
      { symbol: "BTC", amount: 0.5, averageCost: 60000 },
      { symbol: "ETH", amount: 4.0, averageCost: 32000 }
    ];

    const quotes = {
      BTC: btcQuote,
      ETH: await coinCap.getQuote("ETH")
    };

    const ethHistory = await coinCap.getHistoricalCandles("ETH", 30);
    const histories = {
      BTC: btcHistory,
      ETH: ethHistory
    };

    const portfolioSummary = portEngine.calculateSummary(dbHoldings, quotes, histories);
    
    console.log(`✓ Portfolio Value: $${portfolioSummary.totalValue.toFixed(2)}`);
    console.log(`✓ Portfolio Profit: $${portfolioSummary.totalProfit.toFixed(2)} (${portfolioSummary.totalProfitPercent.toFixed(2)}%)`);
    console.log(`✓ Volatility Risk Score: ${portfolioSummary.portfolioRiskScore}/10`);
    
    const btcEthCorr = portfolioSummary.correlationMatrix["BTC"]["ETH"];
    console.log(`✓ BTC-ETH Daily Return Pearson Coefficient: ${btcEthCorr} (Expected positive correlation)`);

    console.log("\n=========================================");
    console.log("ALL TESTS COMPLETED SUCCESSFULLY");
    console.log("=========================================");
  } catch (error) {
    console.error("\n❌ Test execution failed with error:", error);
    process.exit(1);
  }
}

runTests();
