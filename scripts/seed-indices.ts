import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
  console.log("🌱 Starting Global Indices seeding script...");
  for (const ind of indices) {
    const res = await prisma.globalIndex.upsert({
      where: { symbol: ind.symbol },
      update: ind,
      create: ind,
    });
    console.log(`- Seeded index: ${res.symbol} (${res.name})`);
  }
  console.log("✅ Global Indices seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
