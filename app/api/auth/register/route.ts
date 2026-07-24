import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { logger } from "@/lib/logging";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        settings: {
          create: {
            apiKeyFields: JSON.stringify({
              alphaVantage: "",
              finnhub: "",
              theSportsDb: "1",
              footballData: "",
              rapidApi: "",
              fred: "",
            }),
            limits: JSON.stringify({
              dailyBudget: 100,
              unitSize: 10,
              lossStreakLimit: 5,
              maxOpenPositions: 10,
            }),
          },
        },
      },
    });

    logger.api.info(`New user registered: ${email}`);
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.api.error("User registration error", { error: message });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
