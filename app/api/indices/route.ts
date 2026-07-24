import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStockDataProvider } from "@/lib/providers";
import { logger } from "@/lib/logging";

export async function GET() {
  try {
    const indices = await db.globalIndex.findMany();
    return NextResponse.json(indices);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg || "Failed to load indices" }, { status: 500 });
  }
}

export async function POST() {
  try {
    logger.api.info("Syncing Global Indices quote rates from Yahoo Finance...");
    const indices = await db.globalIndex.findMany();
    const provider = getStockDataProvider();

    for (const ind of indices) {
      try {
        const quote = await provider.getQuote(ind.symbol);
        await db.globalIndex.update({
          where: { id: ind.id },
          data: {
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            lastUpdated: new Date(),
          },
        });
      } catch (e) {
        logger.api.error(`Failed to sync index price for ${ind.symbol}: ${e}`);
      }
    }

    const updated = await db.globalIndex.findMany();
    return NextResponse.json({ success: true, indices: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg || "Failed to sync indices" }, { status: 500 });
  }
}
