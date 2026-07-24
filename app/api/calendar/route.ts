import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    let events = await db.economicEvent.findMany({
      orderBy: { eventDate: "asc" },
    });

    // Seed default events if none exist in the database (fresh environment or Vercel migration)
    if (events.length === 0) {
      const defaultEvents = [
        {
          title: "US Core CPI Inflation (YoY)",
          country: "US",
          impact: "High",
          forecast: 3.4,
          previous: 3.6,
          actual: null,
          eventDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
          affectedSectors: JSON.stringify(["financials", "technology", "consumer_discretionary"]),
          description: "Tracks Core Consumer Price Index inflation changes. Primary indicator for Federal Reserve monetary policy direction.",
        },
        {
          title: "Federal Reserve Interest Rate Decision",
          country: "US",
          impact: "High",
          forecast: 5.25,
          previous: 5.25,
          actual: null,
          eventDate: new Date(Date.now() + 86400000 * 7), // 7 days from now
          affectedSectors: JSON.stringify(["financials", "real_estate", "utilities"]),
          description: "FOMC target interest rate announcement. Direct driver of borrowing rates and currency yields.",
        },
        {
          title: "US Non-Farm Payrolls (NFP) Employment Change",
          country: "US",
          impact: "High",
          forecast: 185.0,
          previous: 175.0,
          actual: 195.0,
          eventDate: new Date(Date.now() - 86400000 * 2), // 2 days ago
          affectedSectors: JSON.stringify(["industrials", "consumer_discretionary", "technology"]),
          description: "Measures payroll job growth excluding the farming sector. Critical employment gauge.",
        },
        {
          title: "India GDP Growth Rate (YoY)",
          country: "India",
          impact: "High",
          forecast: 7.0,
          previous: 7.2,
          actual: null,
          eventDate: new Date(Date.now() + 86400000 * 12),
          affectedSectors: JSON.stringify(["financials", "industrials", "materials"]),
          description: "Annualized gross domestic output growth. Benchmark indicator of Indian macroeconomic expansion velocity.",
        },
        {
          title: "RBI Interest Rate Decision",
          country: "India",
          impact: "High",
          forecast: 6.50,
          previous: 6.50,
          actual: null,
          eventDate: new Date(Date.now() + 86400000 * 15),
          affectedSectors: JSON.stringify(["financials", "consumer_discretionary", "real_estate"]),
          description: "Reserve Bank of India Monetary Policy Committee policy repo rate announcement.",
        },
        {
          title: "India CPI Inflation (YoY)",
          country: "India",
          impact: "Medium",
          forecast: 4.8,
          previous: 4.9,
          actual: 4.85,
          eventDate: new Date(Date.now() - 86400000 * 5),
          affectedSectors: JSON.stringify(["consumer_staples", "financials"]),
          description: "Consumer Price Index measuring price changes in retail baskets across urban and rural India.",
        },
        {
          title: "Eurozone CPI Inflation Rate (YoY)",
          country: "EU",
          impact: "High",
          forecast: 2.4,
          previous: 2.4,
          actual: null,
          eventDate: new Date(Date.now() + 86400000 * 5),
          affectedSectors: JSON.stringify(["financials", "energy"]),
          description: "Harmonised Index of Consumer Prices measuring annualized consumer inflation in the Euro Area.",
        },
        {
          title: "ECB Interest Rate Decision",
          country: "EU",
          impact: "High",
          forecast: 4.25,
          previous: 4.25,
          actual: null,
          eventDate: new Date(Date.now() + 86400000 * 10),
          affectedSectors: JSON.stringify(["financials", "industrials"]),
          description: "European Central Bank deposit facility and main refinancing operation interest rate decisions.",
        },
        {
          title: "UK GDP Growth Rate (QoQ)",
          country: "UK",
          impact: "Medium",
          forecast: 0.2,
          previous: 0.1,
          actual: null,
          eventDate: new Date(Date.now() + 86400000 * 4),
          affectedSectors: JSON.stringify(["financials", "consumer_discretionary"]),
          description: "Quarterly measure of economic growth rate in the United Kingdom.",
        },
        {
          title: "US Retail Sales (MoM)",
          country: "US",
          impact: "Medium",
          forecast: 0.4,
          previous: 0.2,
          actual: 0.3,
          eventDate: new Date(Date.now() - 86400000 * 1), // Yesterday
          affectedSectors: JSON.stringify(["consumer_discretionary", "retail"]),
          description: "Measures retail consumer spending growth month-over-month. Direct economic demand indicator.",
        }
      ];

      for (const item of defaultEvents) {
        await db.economicEvent.create({ data: item });
      }

      events = await db.economicEvent.findMany({
        orderBy: { eventDate: "asc" },
      });
    }

    return NextResponse.json(events);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to fetch economic calendar data: ${msg}` },
      { status: 500 }
    );
  }
}
