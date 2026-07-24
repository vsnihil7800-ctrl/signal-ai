import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CoinCapProvider } from "@/modules/crypto/providers";
import { StockBacktester } from "@/modules/stocks/backtester";
import { HistoricalQuote } from "@/lib/providers/stock.interface";

export async function GET() {
  try {
    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "User session not active" }, { status: 401 });
    }

    const backtests = await db.cryptoBacktest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(backtests);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "User session not active" }, { status: 401 });
    }

    const body = await req.json();
    const { symbol, strategy, initialCapital = 10000 } = body;

    if (!symbol || !strategy) {
      return NextResponse.json({ error: "Missing symbol or strategy parameter" }, { status: 400 });
    }

    // 1. Fetch history from CoinCap
    const provider = new CoinCapProvider();
    const history = await provider.getHistoricalCandles(symbol, 90); // past 90 daily candles

    if (history.length < 50) {
      return NextResponse.json({ error: "Insufficient historical data to prime backtest simulation" }, { status: 400 });
    }

    // 2. Map CryptoHistoricalQuote to standard HistoricalQuote interface
    const mappedCandles: HistoricalQuote[] = history.map((c) => ({
      date: c.date,
      open: c.price,
      high: c.price,
      low: c.price,
      close: c.price,
      volume: c.volume,
    }));

    // 3. Run backtest engine
    const backtester = new StockBacktester();
    const result = backtester.run(symbol, mappedCandles, strategy, initialCapital);

    // 4. Save results to SQLite
    const saved = await db.cryptoBacktest.create({
      data: {
        userId: user.id,
        symbol: symbol.toUpperCase(),
        strategy,
        cagr: result.cagr,
        sharpeRatio: result.winRate * 2.0, // Mocked sharpe representation
        maxDrawdown: result.maxDrawdown,
        tradesCount: result.tradesCount,
        winRate: result.winRate,
        finalBalance: result.finalValue,
      }
    });

    return NextResponse.json({ result, saved });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
