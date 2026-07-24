import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStockDataProvider, HistoricalQuote } from "@/lib/providers";
import { StockBacktester } from "@/modules/stocks/backtester";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ticker = body.ticker?.toUpperCase();
    const strategy = body.strategy || "rsi";
    const initialCapital = parseFloat(body.initialCapital) || 10000;

    if (!ticker) {
      return NextResponse.json({ error: "Missing ticker parameter" }, { status: 400 });
    }

    if (strategy !== "rsi" && strategy !== "macd" && strategy !== "sma_cross") {
      return NextResponse.json({ error: "Invalid strategy code" }, { status: 400 });
    }

    const start = body.startDate ? new Date(body.startDate) : new Date();
    if (!body.startDate) {
      start.setFullYear(start.getFullYear() - 2);
    }
    const end = body.endDate ? new Date(body.endDate) : new Date();

    const isIndian = await db.stock.findUnique({ where: { ticker } });
    const providerTicker = isIndian ? `${ticker}.NS` : ticker;

    // Try to load from HistoricalCandle table first (Primary Source)
    const dbCandles = await db.historicalCandle.findMany({
      where: {
        ticker,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: "asc" },
    });

    let candles: HistoricalQuote[] = [];
    let dataSource = "historical";

    if (dbCandles.length > 0) {
      candles = dbCandles.map((c) => ({
        date: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume ?? 0,
      }));
    } else {
      // Fallback to provider query (Secondary Source)
      const provider = getStockDataProvider();
      try {
        candles = await provider.getHistoricalCandles(providerTicker, start, end);
      } catch (e) {
        console.error(`Failed to fetch candles from provider for ${providerTicker}:`, e);
      }
    }

    if (candles.length === 0) {
      dataSource = "simulated";
      let currentPrice = 150.0;
      if (isIndian) {
        currentPrice = isIndian.price;
      } else {
        const isUS = await db.uSStock.findUnique({ where: { ticker } });
        if (isUS) {
          currentPrice = isUS.price;
        }
      }

      // Walk backwards from current price to generate realistic historical candles
      let price = currentPrice;
      const simulatedCandles: HistoricalQuote[] = [];
      const curr = new Date(end);

      while (curr >= start) {
        const day = curr.getDay();
        if (day !== 0 && day !== 6) { // exclude weekends
          const changePercent = -2.0 + Math.random() * 4.1; // -2% to +2.1%
          const close = price;
          const open = price / (1 + changePercent / 100);
          const low = Math.min(open, close) * (1 - Math.random() * 0.01);
          const high = Math.max(open, close) * (1 + Math.random() * 0.01);
          const volume = Math.floor(500000 + Math.random() * 5000000);

          simulatedCandles.push({
            date: new Date(curr),
            open,
            high,
            low,
            close,
            volume
          });
          price = open;
        }
        curr.setDate(curr.getDate() - 1);
      }

      candles = simulatedCandles.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    if (candles.length === 0) {
      return NextResponse.json(
        { error: `No candle data found for ${ticker} in the selected range` },
        { status: 404 }
      );
    }

    const backtester = new StockBacktester();
    const results = backtester.run(ticker, candles, strategy, initialCapital);

    return NextResponse.json({
      ...results,
      dataSource,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg || "Failed to execute backtest simulation" },
      { status: 500 }
    );
  }
}
