import { getStockDataProvider } from "../lib/providers";

async function run() {
  console.log("🧪 Starting stock provider verification test script...");
  const provider = getStockDataProvider();
  console.log(`Active Provider Instance: ${provider.name}`);

  const tickers = ["AAPL", "MSFT", "TSLA"];

  for (const ticker of tickers) {
    console.log(`\nRequesting quote details for ticker: ${ticker}`);
    try {
      const quote = await provider.getQuote(ticker);
      console.log(`Success details:`);
      console.log(`  Price: $${quote.price}`);
      console.log(`  Change: $${quote.change} (${quote.changePercent}%)`);
      console.log(`  Range: High $${quote.high} / Low $${quote.low}`);
      console.log(`  Timestamp: ${quote.lastUpdated}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Failed to fetch quote for ${ticker}: ${msg}`);
    }
  }

  console.log("\nRequesting daily candles for AAPL (Last 5 Days)...");
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 5);
    const candles = await provider.getHistoricalCandles("AAPL", start, end);
    console.log(`Success details (${candles.length} candles returned):`);
    candles.forEach((c) => {
      console.log(`  ${c.date.toISOString().split("T")[0]}: Close: $${c.close}, Volume: ${c.volume}`);
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Failed to fetch candles: ${msg}`);
  }
}

run().catch((err) => {
  console.error("❌ Stock provider test script failed:", err);
});
export default run;
