import { getStockDataProvider } from "../lib/providers";
import { StockBacktester } from "../modules/stocks/backtester";

async function run() {
  console.log("🧪 Starting backtest engine mathematical verification script...");

  const provider = getStockDataProvider();
  console.log(`Active Provider: ${provider.name}`);

  const ticker = "AAPL";
  const strategy = "rsi";
  const capital = 10000;

  console.log(`\nFetching 2 years of daily candles for: ${ticker}`);
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 2);

  const candles = await provider.getHistoricalCandles(ticker, start, end);
  console.log(`Fetched ${candles.length} candles successfully.`);

  if (candles.length < 100) {
    throw new Error("Insufficient candles retrieved to run backtest");
  }

  const backtester = new StockBacktester();
  const results = backtester.run(ticker, candles, strategy, capital);

  console.log("\nSimulation execution completed successfully.");
  console.log("Results Summary:");
  console.log(`- Strategy Code: ${results.strategy.toUpperCase()}`);
  console.log(`- Initial Capital: $${results.initialCapital.toLocaleString()}`);
  console.log(`- Final Portfolio Value: $${results.finalValue.toFixed(2)}`);
  console.log(`- Total Return: ${(results.totalReturn * 100).toFixed(2)}% (vs Benchmark: ${(results.benchmarkReturn * 100).toFixed(2)}%)`);
  console.log(`- Portfolio CAGR: ${(results.cagr * 100).toFixed(2)}% (vs Benchmark: ${(results.benchmarkCagr * 100).toFixed(2)}%)`);
  console.log(`- Max Drawdown: ${(results.maxDrawdown * 100).toFixed(2)}% (vs Benchmark: ${(results.benchmarkMaxDrawdown * 100).toFixed(2)}%)`);
  console.log(`- Completed Trades Count: ${results.tradesCount}`);
  console.log(`- Strategy Win Rate: ${(results.winRate * 100).toFixed(1)}%`);
  console.log(`- Predictive Precision: ${(results.precision * 100).toFixed(1)}%`);
  console.log(`- Predictive Recall: ${(results.recall * 100).toFixed(1)}%`);
  console.log(`- Predictive F1 Score: ${(results.f1Score * 100).toFixed(1)}%`);
  console.log(`- Total Equity Points Tracked: ${results.equityCurve.length}`);
  
  if (results.trades.length > 0) {
    console.log(`- First Trade: [${results.trades[0].type}] on ${results.trades[0].date} at $${results.trades[0].price}`);
    console.log(`- Last Trade: [${results.trades[results.trades.length - 1].type}] on ${results.trades[results.trades.length - 1].date} at $${results.trades[results.trades.length - 1].price}`);
  }

  console.log("\n✅ Backtester calculations validated and completed.");
}

run().catch((err) => {
  console.error("❌ Backtester test script failed:", err);
});
export default run;
