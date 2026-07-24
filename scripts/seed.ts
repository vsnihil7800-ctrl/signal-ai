import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Create a default admin user
  const email = "admin@signalai.local";
  const password = "password123";
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Default Admin",
      passwordHash,
    },
  });
  console.log(`👤 User created/verified: ${user.email} (Password: ${password})`);

  // 2. Create user settings
  const settings = await prisma.settings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      apiKeyFields: JSON.stringify({
        alphaVantage: "MOCK_AV_KEY_12345",
        finnhub: "MOCK_FH_KEY_67890",
        theSportsDb: "1",
        footballData: "MOCK_FD_KEY_ABCDE",
        rapidApi: "MOCK_RA_KEY_FGHIJ",
        fred: "MOCK_FRED_KEY_KLMNO",
      }),
      limits: JSON.stringify({
        dailyBudget: 100,
        unitSize: 10,
        lossStreakLimit: 5,
        maxOpenPositions: 10,
      }),
    },
  });
  console.log(`⚙️ Default settings initialized for user ID: ${user.id}`);

  // 3. Create mock watchlist
  await prisma.watchlist.create({
    data: {
      name: "Tech Watchlist",
      userId: user.id,
      tickers: JSON.stringify(["AAPL", "MSFT", "NVDA", "TSLA"]),
    },
  });
  console.log("📋 Tech Watchlist seeded");

  // 4. Create mock Stocks
  const stocks = [
    { ticker: "AAPL", name: "Apple Inc.", sector: "Technology", industry: "Consumer Electronics", price: 189.84, change: 1.25, changePercent: 0.66 },
    { ticker: "MSFT", name: "Microsoft Corporation", sector: "Technology", industry: "Software—Infrastructure", price: 421.90, change: -2.10, changePercent: -0.50 },
    { ticker: "NVDA", name: "NVIDIA Corporation", sector: "Technology", industry: "Semiconductors", price: 903.56, change: 15.42, changePercent: 1.74 },
    { ticker: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical", industry: "Auto Manufacturers", price: 177.46, change: -4.30, changePercent: -2.37 },
  ];

  for (const s of stocks) {
    await prisma.stock.upsert({
      where: { ticker: s.ticker },
      update: s,
      create: s,
    });
  }
  console.log(`📈 Mock Stocks seeded (${stocks.length} tickers)`);

  // 5. Create mock Signals
  const signals = [
    {
      ticker: "AAPL",
      recommendation: "Bullish",
      confidence: 0.78,
      riskLevel: "Low",
      technicalScore: 0.82,
      sentimentScore: 0.75,
      fundamentalScore: 0.80,
      macroScore: 0.70,
      volatilityScore: 0.65,
      reasoning: "Strong technical breakout above 50-day SMA. FinBERT news sentiment is highly positive on upcoming product updates, paired with stable net profit margins.",
    },
    {
      ticker: "TSLA",
      recommendation: "Bearish",
      confidence: 0.68,
      riskLevel: "High",
      technicalScore: 0.40,
      sentimentScore: 0.35,
      fundamentalScore: 0.60,
      macroScore: 0.50,
      volatilityScore: 0.85,
      reasoning: "RSI is entering oversold but MACD indicates downward momentum. News sentiment is negative due to delivery shortfalls, increasing the overall risk profile.",
    },
  ];

  for (const sig of signals) {
    await prisma.signal.create({ data: sig });
  }
  console.log("🚦 Mock AI signals seeded");

  // 6. Create mock Sports Fixtures and Predictions
  const fixture1 = await prisma.sportsFixture.create({
    data: {
      sport: "football",
      league: "English Premier League",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      status: "scheduled",
      rawData: JSON.stringify({ matchday: 34, venue: "Emirates Stadium" }),
    },
  });

  await prisma.prediction.create({
    data: {
      fixtureId: fixture1.id,
      predictedWinner: "Arsenal",
      homeProb: 0.65,
      awayProb: 0.15,
      drawProb: 0.20,
      confidence: 0.72,
      riskLevel: "Low",
      precision: 0.78,
      recall: 0.82,
      f1Score: 0.80,
      calibrationScore: 0.91,
      numSamples: 150,
      trainingWindow: "Last 3 Seasons",
      reason: "Arsenal shows excellent home form with zero defeats in the last 8 home matches. Chelsea suffers from key defensive suspensions and travels with a shorter rest window.",
    },
  });

  const fixture2 = await prisma.sportsFixture.create({
    data: {
      sport: "cricket",
      league: "Indian Premier League",
      homeTeam: "Mumbai Indians",
      awayTeam: "Chennai Super Kings",
      eventDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // in 2 days
      status: "scheduled",
      rawData: JSON.stringify({ venue: "Wankhede Stadium", pitch: "Batting Friendly" }),
    },
  });

  await prisma.prediction.create({
    data: {
      fixtureId: fixture2.id,
      predictedWinner: "Mumbai Indians",
      homeProb: 0.54,
      awayProb: 0.46,
      drawProb: 0.0,
      confidence: 0.58,
      riskLevel: "Medium",
      precision: 0.69,
      recall: 0.73,
      f1Score: 0.71,
      calibrationScore: 0.85,
      numSamples: 85,
      trainingWindow: "CSK vs MI head-to-head (5 years)",
      reason: "Historical data shows Mumbai holding a 62% win rate at Wankhede against Chennai. However, recent Chennai form matches Mumbai's run rate closely, increasing the volatility.",
    },
  });
  console.log("⚽ Mock Sports Fixtures & Predictions seeded");

  // 7. Create mock Economic Events
  const events = [
    {
      title: "US Core CPI Inflation (YoY)",
      description: "Measures change in the price of goods and services excluding food and energy. A critical input for Federal Reserve monetary decisions.",
      eventDate: new Date(),
      country: "US",
      actual: 3.6,
      forecast: 3.5,
      previous: 3.7,
      impact: "High",
      affectedSectors: JSON.stringify(["Technology", "Real Estate", "Financials"]),
    },
    {
      title: "Federal Reserve Interest Rate Decision",
      description: "FOMC announcement regarding target federal funds rate policy.",
      eventDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // in 10 days
      country: "US",
      impact: "High",
      affectedSectors: JSON.stringify(["Banking", "Growth Stocks", "Bonds"]),
    },
  ];

  for (const ev of events) {
    await prisma.economicEvent.create({ data: ev });
  }
  console.log("📅 Mock Economic Events seeded");

  // 8. Create mock API Usage metrics
  const usage = [
    { apiName: "AlphaVantage", endpoint: "GLOBAL_QUOTE", requestsUsed: 8, requestLimit: 25, date: new Date().toISOString().split("T")[0] },
    { apiName: "Finnhub", endpoint: "QUOTE", requestsUsed: 14, requestLimit: 60, date: new Date().toISOString().split("T")[0] },
    { apiName: "TheSportsDB", endpoint: "fixtures", requestsUsed: 22, requestLimit: 1000, date: new Date().toISOString().split("T")[0] },
  ];

  for (const u of usage) {
    await prisma.aPIUsage.create({ data: u });
  }
  console.log("📊 Mock API Usage metrics seeded");

  // 9. Log first few system logs
  await prisma.log.create({
    data: {
      level: "info",
      category: "db",
      message: "Database schema successfully migrated to SQLite",
      payload: JSON.stringify({ provider: "sqlite" }),
    },
  });
  await prisma.log.create({
    data: {
      level: "info",
      category: "api",
      message: "API keys verified and validated locally",
      payload: JSON.stringify({ status: "active" }),
    },
  });

  // 10. Seed US Stocks
  const usStocks = [
    { ticker: "AAPL", name: "Apple Inc.", sector: "Technology", industry: "Consumer Electronics", price: 189.84, change: 1.25, changePercent: 0.66 },
    { ticker: "MSFT", name: "Microsoft Corporation", sector: "Technology", industry: "Software—Infrastructure", price: 421.90, change: -2.10, changePercent: -0.50 },
    { ticker: "NVDA", name: "NVIDIA Corporation", sector: "Technology", industry: "Semiconductors", price: 903.56, change: 15.42, changePercent: 1.74 },
    { ticker: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical", industry: "Auto Manufacturers", price: 177.46, change: -4.30, changePercent: -2.37 },
    { ticker: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical", industry: "Internet Retail", price: 178.15, change: 2.11, changePercent: 1.20 },
    { ticker: "GOOGL", name: "Alphabet Inc.", sector: "Communication Services", industry: "Internet Content & Information", price: 151.60, change: -0.85, changePercent: -0.56 },
    { ticker: "META", name: "Meta Platforms Inc.", sector: "Communication Services", industry: "Internet Content & Information", price: 505.12, change: 8.44, changePercent: 1.70 },
    { ticker: "AMD", name: "Advanced Micro Devices Inc.", sector: "Technology", industry: "Semiconductors", price: 180.49, change: -3.12, changePercent: -1.70 },
    { ticker: "NFLX", name: "Netflix Inc.", sector: "Communication Services", industry: "Entertainment", price: 610.30, change: 5.20, changePercent: 0.86 },
  ];

  for (const s of usStocks) {
    await prisma.uSStock.upsert({
      where: { ticker: s.ticker },
      update: s,
      create: s,
    });
  }
  console.log("🇺🇸 US Stocks preloaded successfully");

  // 11. Seed US Stock Watchlist
  await prisma.uSStockWatchlist.create({
    data: {
      name: "US Tech Watchlist",
      userId: user.id,
      tickers: JSON.stringify(["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL"]),
    },
  });
  console.log("📋 US Watchlist seeded");

  // 12. Seed US Stock Signals
  await prisma.uSStockSignal.create({
    data: {
      ticker: "AAPL",
      recommendation: "Bullish",
      confidence: 0.85,
      riskLevel: "Medium",
      technicalScore: 8.2,
      sentimentScore: 7.9,
      fundamentalScore: 8.8,
      macroScore: 7.2,
      volatilityScore: 6.5,
      reasoning: "Strong technical support combined with positive consumer sentiment for new AI hardware.",
    },
  });

  // 13. Seed Global Indices
  const indices = [
    { symbol: "^NSEI", name: "NIFTY 50", price: 22405.85, change: 135.10, changePercent: 0.61 },
    { symbol: "^BSESN", name: "SENSEX", price: 73803.15, change: 480.20, changePercent: 0.65 },
    { symbol: "^GSPC", name: "S&P 500", price: 5117.09, change: 51.20, changePercent: 1.01 },
    { symbol: "^IXIC", name: "NASDAQ Composite", price: 15927.90, change: 316.65, changePercent: 2.03 },
    { symbol: "^DJI", name: "Dow Jones Industrial Average", price: 38239.66, change: 153.86, changePercent: 0.40 },
    { symbol: "^RUT", name: "Russell 2000", price: 2002.50, change: 20.40, changePercent: 1.03 },
    { symbol: "^FTSE", name: "FTSE 100", price: 8139.83, change: 60.10, changePercent: 0.74 },
    { symbol: "^GDAXI", name: "DAX", price: 18161.01, change: 245.20, changePercent: 1.37 },
    { symbol: "^N225", name: "Nikkei 225", price: 38435.61, change: -320.40, changePercent: -0.83 },
    { symbol: "^HSI", name: "Hang Seng Index", price: 17651.15, change: 360.50, changePercent: 2.08 },
  ];

  for (const ind of indices) {
    await prisma.globalIndex.upsert({
      where: { symbol: ind.symbol },
      update: ind,
      create: ind,
    });
  }
  console.log("📈 Global Indices seeded successfully");

  // 14. Seed Crypto Assets
  const cryptos = [
    { symbol: "BTC", name: "Bitcoin", coingeckoId: "bitcoin", rank: 1, price: 64205.10, change24h: 1.45, marketCap: 1260000000000, volume24h: 28500000000 },
    { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", rank: 2, price: 3110.45, change24h: 2.10, marketCap: 374000000000, volume24h: 14200000000 },
    { symbol: "SOL", name: "Solana", coingeckoId: "solana", rank: 5, price: 145.80, change24h: 5.60, marketCap: 65000000000, volume24h: 3100000000 },
    { symbol: "BNB", name: "BNB", coingeckoId: "binancecoin", rank: 4, price: 585.20, change24h: 0.85, marketCap: 87000000000, volume24h: 1200000000 },
    { symbol: "XRP", name: "XRP", coingeckoId: "ripple", rank: 7, price: 0.52, change24h: -1.20, marketCap: 28000000000, volume24h: 900000000 },
    { symbol: "ADA", name: "Cardano", coingeckoId: "cardano", rank: 10, price: 0.48, change24h: 0.35, marketCap: 17000000000, volume24h: 350000000 },
    { symbol: "MATIC", name: "Polygon", coingeckoId: "matic-network", rank: 18, price: 0.72, change24h: 1.15, marketCap: 7100000000, volume24h: 220000000 },
    { symbol: "AVAX", name: "Avalanche", coingeckoId: "avalanche-2", rank: 12, price: 36.40, change24h: 4.25, marketCap: 14000000000, volume24h: 450000000 },
    { symbol: "LINK", name: "Chainlink", coingeckoId: "chainlink", rank: 15, price: 15.10, change24h: 2.90, marketCap: 8900000000, volume24h: 300000000 },
    { symbol: "DOGE", name: "Dogecoin", coingeckoId: "dogecoin", rank: 8, price: 0.152, change24h: -3.40, marketCap: 21900000000, volume24h: 1800000000 },
  ];

  for (const c of cryptos) {
    await prisma.cryptoAsset.upsert({
      where: { symbol: c.symbol },
      update: c,
      create: c,
    });
  }
  console.log("₿ Crypto Assets seeded successfully");

  // 15. Seed Crypto Watchlist
  await prisma.cryptoWatchlist.create({
    data: {
      userId: user.id,
      symbols: JSON.stringify(["BTC", "ETH", "SOL", "BNB"]),
    },
  });
  console.log("📋 Crypto Watchlist seeded");

  // 16. Seed Crypto Signal
  await prisma.cryptoSignal.create({
    data: {
      symbol: "BTC",
      recommendation: "Bullish",
      confidence: 0.78,
      riskLevel: "Low",
      technicalScore: 7.9,
      sentimentScore: 7.2,
      onChainScore: 8.5,
      volumeScore: 7.8,
      volatilityScore: 5.4,
      reasoning: "Steady accumulation patterns at current support level with declining exchange reserves.",
    },
  });

  // 17. Seed Crypto Portfolio
  await prisma.cryptoPortfolio.create({
    data: {
      userId: user.id,
      symbol: "BTC",
      amount: 0.25,
      averageCost: 61500,
    },
  });
  await prisma.cryptoPortfolio.create({
    data: {
      userId: user.id,
      symbol: "ETH",
      amount: 1.5,
      averageCost: 2950,
    },
  });
  console.log("💼 Crypto Portfolio holdings seeded");

  // 18. Seed Crypto Transactions
  await prisma.cryptoTransaction.create({
    data: {
      userId: user.id,
      symbol: "BTC",
      type: "BUY",
      amount: 0.25,
      price: 61500,
    },
  });
  await prisma.cryptoTransaction.create({
    data: {
      userId: user.id,
      symbol: "ETH",
      type: "BUY",
      amount: 1.5,
      price: 2950,
    },
  });

  console.log("🌱 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
