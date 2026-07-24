import { PrismaClient } from "@prisma/client";
import { getStockDataProvider } from "../lib/providers";

const prisma = new PrismaClient();

const tickers = [
  { ticker: "RELIANCE", providerTicker: "RELIANCE.NS" },
  { ticker: "TCS", providerTicker: "TCS.NS" },
  { ticker: "AAPL", providerTicker: "AAPL" },
  { ticker: "MSFT", providerTicker: "MSFT" },
  { ticker: "NVDA", providerTicker: "NVDA" },
  { ticker: "TSLA", providerTicker: "TSLA" },
  { ticker: "AMZN", providerTicker: "AMZN" },
  { ticker: "GOOGL", providerTicker: "GOOGL" },
  { ticker: "IBM", providerTicker: "IBM" },
];

const start = new Date("2024-01-01T00:00:00Z");
const end = new Date("2026-01-01T23:59:59Z");

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("🌱 Starting historical candle seeding script...");
  console.log(`Date range: ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`);
  
  const provider = getStockDataProvider();
  const succeeded: string[] = [];
  const failed: { ticker: string; error: string }[] = [];
  let rateLimitHit = false;
  
  for (let i = 0; i < tickers.length; i++) {
    const { ticker, providerTicker } = tickers[i];
    console.log(`\n[${i + 1}/${tickers.length}] Fetching candles for ${ticker} (using provider symbol: ${providerTicker})...`);
    
    try {
      const candles = await provider.getHistoricalCandles(providerTicker, start, end);
      console.log(`- Fetched ${candles.length} candles from provider.`);
      
      if (candles.length > 0) {
        console.log(`- Saving candles for ${ticker} to database...`);
        let savedCount = 0;
        
        for (const c of candles) {
          const candleDate = new Date(c.date);
          
          await prisma.historicalCandle.upsert({
            where: {
              ticker_date: {
                ticker,
                date: candleDate,
              }
            },
            update: {
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
            },
            create: {
              ticker,
              date: candleDate,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
            }
          });
          savedCount++;
        }
        console.log(`- Successfully upserted ${savedCount} historical candles for ${ticker}.`);
        succeeded.push(ticker);
      } else {
        console.log(`⚠️ No candles returned for ${ticker}.`);
        failed.push({ ticker, error: "No candles returned by provider" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ Failed to fetch/save candles for ${ticker}:`, e);
      failed.push({ ticker, error: msg });

      if (msg.toLowerCase().includes("limit") || msg.toLowerCase().includes("frequency") || msg.toLowerCase().includes("note") || msg.toLowerCase().includes("information")) {
        console.warn("⚠️ Rate limit detected! Stopping seeding cleanly to prevent further failed API requests.");
        rateLimitHit = true;
        break;
      }
    }
    
    if (i < tickers.length - 1) {
      console.log("⏳ Throttling for 15 seconds to respect free-tier rate limits...");
      await delay(15000);
    }
  }

  console.log("\n==========================================");
  console.log("🌱 SEEDING SUMMARY:");
  console.log(`- Total watchlisted tickers: ${tickers.length}`);
  console.log(`- Succeeded (${succeeded.length}): ${succeeded.join(", ") || "None"}`);
  console.log(`- Failed (${failed.length}):`);
  failed.forEach(f => {
    console.log(`  * ${f.ticker}: ${f.error}`);
  });
  if (rateLimitHit) {
    console.log("⚠️ Seeding was aborted early due to API rate limits.");
  }
  console.log("==========================================");
  console.log("\n✅ Historical candle seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
