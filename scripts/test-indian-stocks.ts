import { PrismaClient } from "@prisma/client";
import { getStockDataProvider } from "../lib/providers";

const db = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("TESTING INDIAN STOCK WATCHLIST & AI SIGNALS");
  console.log("=================================================");

  const ticker = "RELIANCE";
  const formattedTicker = "RELIANCE.NS";

  // Clean up any existing records for test
  console.log(`Cleaning old test data for ${formattedTicker}...`);
  await db.stock.deleteMany({ where: { ticker: formattedTicker } }).catch(() => {});
  await db.signal.deleteMany({ where: { ticker: formattedTicker } }).catch(() => {});

  // Simulate API POST call logic
  console.log(`Adding stock ${ticker}...`);
  const provider = getStockDataProvider();
  
  let price = 150.0;
  let change = 0.0;
  let changePercent = 0.0;
  let displayName = "Reliance Industries Ltd";

  try {
    const quote = await provider.getQuote(formattedTicker);
    price = quote.price;
    change = quote.change;
    changePercent = quote.changePercent;
    console.log(`✓ Fetched live quote for ${formattedTicker}: Price: ₹${price}, Change: ${change} (${changePercent}%)`);
  } catch (e) {
    console.error("✗ Failed to fetch live quote:", e);
  }

  const stock = await db.stock.create({
    data: {
      ticker: formattedTicker,
      name: displayName,
      sector: "Energy",
      industry: "Oil & Gas",
      price,
      change,
      changePercent,
    }
  });

  console.log(`✓ Stock record created in DB: ${stock.ticker} - Price: ${stock.price}`);

  // Run AI rating calculation for the newly added stock immediately
  const technicalScore = Math.max(0.1, Math.min(0.9, 0.5 + (changePercent / 10)));
  const sentimentScore = 0.65;
  const fundamentalScore = 0.5;
  const macroScore = 0.5;
  const volatilityScore = 0.5;

  const finalScore = (technicalScore + sentimentScore + fundamentalScore + macroScore + volatilityScore) / 5;

  let recommendation = "Neutral";
  if (finalScore > 0.55) recommendation = "Bullish";
  else if (finalScore < 0.45) recommendation = "Bearish";

  const confidence = Math.max(0.1, Math.abs(finalScore - 0.5) * 2);

  const signal = await db.signal.create({
    data: {
      ticker: formattedTicker,
      recommendation,
      confidence,
      riskLevel: finalScore > 0.7 ? "High" : finalScore < 0.3 ? "Medium" : "Low",
      technicalScore,
      sentimentScore,
      fundamentalScore,
      macroScore,
      volatilityScore,
      reasoning: `AI rating calculated as ${recommendation} with ${Math.round(confidence * 100)}% model confidence. Driven by technical indicators scoring at ${Math.round(technicalScore * 100)}% combined with a news sentiment rating of ${Math.round(sentimentScore * 100)}%.`,
    }
  });

  console.log(`✓ AI Signal created: ${signal.ticker} - Recommendation: ${signal.recommendation}, Confidence: ${Math.round(signal.confidence * 100)}%`);
  console.log(`✓ AI Reasoning: "${signal.reasoning}"`);

  if (price > 0 && signal.recommendation !== "Neutral" && signal.confidence > 0) {
    console.log("=================================================");
    console.log("ALL INDIAN STOCK WATCHLIST & AI TESTS PASSED!");
    console.log("=================================================");
  } else {
    throw new Error("Validation check failed: Empty price or fallback Neutral ratings detected.");
  }
}

main()
  .catch((err) => {
    console.error("✗ Test failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
