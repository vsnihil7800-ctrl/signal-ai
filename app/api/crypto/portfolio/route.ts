import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CryptoPortfolio } from "@prisma/client";
import { getCryptoDataProvider } from "@/modules/crypto/providers";
import { CryptoPortfolioEngine } from "@/modules/crypto/portfolio";
import { CryptoQuote, CryptoHistoricalQuote } from "@/modules/crypto/providers";

export async function GET() {
  try {
    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "User session not active" }, { status: 401 });
    }

    const holdings = await db.cryptoPortfolio.findMany({
      where: { userId: user.id },
    });

    const transactions = await db.cryptoTransaction.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
    });

    const provider = getCryptoDataProvider();
    const quotes: Record<string, CryptoQuote> = {};
    const histories: Record<string, CryptoHistoricalQuote[]> = {};
    
    await Promise.all(
      holdings.map(async (h: CryptoPortfolio) => {
        try {
          const q = await provider.getQuote(h.symbol);
          quotes[h.symbol] = q;
          
          const hist = await provider.getHistoricalCandles(h.symbol, 30);
          histories[h.symbol] = hist;
        } catch (e) {
          console.error(`Failed to load quotes for ${h.symbol}:`, e);
        }
      })
    );

    const engine = new CryptoPortfolioEngine();
    const summary = engine.calculateSummary(holdings, quotes, histories);

    return NextResponse.json({ summary, transactions });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg || "Failed to load crypto portfolio" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, amount, price, type } = body;
    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "User session not active" }, { status: 401 });
    }

    const cleanSymbol = symbol.toUpperCase();
    const cleanAmount = parseFloat(amount);
    const cleanPrice = parseFloat(price);

    if (!cleanSymbol || isNaN(cleanAmount) || isNaN(cleanPrice)) {
      return NextResponse.json({ error: "Invalid input parameters" }, { status: 400 });
    }

    await db.cryptoTransaction.create({
      data: {
        userId: user.id,
        symbol: cleanSymbol,
        type,
        amount: cleanAmount,
        price: cleanPrice,
      },
    });

    const holding = await db.cryptoPortfolio.findFirst({
      where: { userId: user.id, symbol: cleanSymbol },
    });

    if (holding) {
      let newAmount = holding.amount;
      let newAverageCost = holding.averageCost;

      if (type === "BUY") {
        newAmount = holding.amount + cleanAmount;
        newAverageCost = (holding.amount * holding.averageCost + cleanAmount * cleanPrice) / newAmount;
      } else if (type === "SELL") {
        newAmount = Math.max(0, holding.amount - cleanAmount);
      }

      if (newAmount <= 0) {
        await db.cryptoPortfolio.delete({
          where: { id: holding.id },
        });
      } else {
        await db.cryptoPortfolio.update({
          where: { id: holding.id },
          data: {
            amount: newAmount,
            averageCost: newAverageCost,
          },
        });
      }
    } else {
      if (type === "BUY") {
        await db.cryptoPortfolio.create({
          data: {
            userId: user.id,
            symbol: cleanSymbol,
            amount: cleanAmount,
            averageCost: cleanPrice,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg || "Operation failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing holding ID" }, { status: 400 });
    }

    await db.cryptoPortfolio.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg || "Failed to delete holding" }, { status: 500 });
  }
}
