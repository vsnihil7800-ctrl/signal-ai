import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PortfolioOptimizer, AssetWeight } from "@/modules/portfolio/optimizer";

export async function GET() {
  try {
    const portfolios = await db.portfolio.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(portfolios);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch saved portfolios" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, allocations, allocation: capitalAmount } = body;

    if (!name) {
      return NextResponse.json({ error: "Missing portfolio name" }, { status: 400 });
    }
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json({ error: "Invalid allocations array" }, { status: 400 });
    }
    const capital = parseFloat(capitalAmount) || 10000;

    // Check that weights sum to exactly 1.0 (or 100%)
    const sumWeights = allocations.reduce((sum: number, a: { weight: string | number }) => sum + parseFloat(String(a.weight)), 0);
    if (Math.abs(sumWeights - 1.0) > 0.01 && Math.abs(sumWeights - 100) > 1.0) {
      return NextResponse.json(
        { error: `Weights must sum to 100% (currently: ${sumWeights * (sumWeights <= 1.0 ? 100 : 1)}%)` },
        { status: 400 }
      );
    }

    // Convert weights to 0.0 - 1.0 bounds
    const parsedAllocations: AssetWeight[] = allocations.map((a: { ticker: string; weight: string | number }) => ({
      ticker: a.ticker.toUpperCase(),
      weight: parseFloat(String(a.weight)) > 1.0 ? parseFloat(String(a.weight)) / 100 : parseFloat(String(a.weight)),
    }));

    const optimizer = new PortfolioOptimizer();
    const stats = await optimizer.optimize(parsedAllocations);

    // Save the portfolio in SQLite db
    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user found in database. Please seed user data first." }, { status: 400 });
    }

    const saved = await db.portfolio.create({
      data: {
        name,
        userId: user.id,
        assets: JSON.stringify(parsedAllocations),
        allocation: capital,
        sharpeRatio: stats.sharpeRatio,
        volatility: stats.volatility,
        expectedReturn: stats.expectedReturn,
        riskScore: stats.riskScore,
      },
    });

    return NextResponse.json({
      portfolio: saved,
      stats,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg || "Failed to optimize portfolio allocations" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing portfolio ID" }, { status: 400 });
    }

    await db.portfolio.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg || "Failed to delete portfolio" },
      { status: 500 }
    );
  }
}
