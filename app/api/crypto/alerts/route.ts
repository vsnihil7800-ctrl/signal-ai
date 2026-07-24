import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// In-memory fallback alerts store for offline/degraded mode
let memoryAlerts: Array<{
  id: string;
  userId: string;
  symbol: string;
  type: string;
  target: number;
  triggered: boolean;
  createdAt: string;
}> = [
  {
    id: "mem-1",
    userId: "default-user-id",
    symbol: "BTC",
    type: "PRICE_ABOVE",
    target: 68000,
    triggered: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mem-2",
    userId: "default-user-id",
    symbol: "ETH",
    type: "PRICE_BELOW",
    target: 3200,
    triggered: false,
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  try {
    let userId = "default-user-id";
    try {
      const user = await db.user.findFirst();
      if (user) userId = user.id;

      const alerts = await db.cryptoAlert.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(alerts);
    } catch {
      // Return memory store if database is unreachable
      return NextResponse.json(memoryAlerts);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, type, target } = body;

    if (!symbol || !type || target === undefined) {
      return NextResponse.json({ error: "Missing required parameters (symbol, type, target)" }, { status: 400 });
    }

    let userId = "default-user-id";
    try {
      const user = await db.user.findFirst();
      if (user) userId = user.id;

      const alert = await db.cryptoAlert.create({
        data: {
          userId,
          symbol: symbol.toUpperCase(),
          type, // PRICE_ABOVE or PRICE_BELOW
          target: parseFloat(target),
        },
      });
      return NextResponse.json(alert);
    } catch {
      // Fallback in-memory creation
      const newAlert = {
        id: `mem-${Date.now()}`,
        userId,
        symbol: symbol.toUpperCase(),
        type,
        target: parseFloat(target),
        triggered: false,
        createdAt: new Date().toISOString(),
      };
      memoryAlerts.unshift(newAlert);
      return NextResponse.json(newAlert);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing alert ID" }, { status: 400 });
    }

    try {
      await db.cryptoAlert.delete({
        where: { id },
      });
    } catch {
      memoryAlerts = memoryAlerts.filter((a) => a.id !== id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
