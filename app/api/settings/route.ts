import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { logger } from "@/lib/logging";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const token = cookieHeader
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1];

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let settings = await db.settings.findUnique({
    where: { userId: payload.id },
  });

  if (!settings) {
    settings = await db.settings.create({
      data: {
        userId: payload.id,
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
    });
  }

  return NextResponse.json({
    id: settings.id,
    userId: settings.userId,
    apiKeyFields: JSON.parse(settings.apiKeyFields),
    limits: JSON.parse(settings.limits),
  });
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const token = cookieHeader
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKeyFields, limits } = await request.json();

    const updatedSettings = await db.settings.upsert({
      where: { userId: payload.id },
      update: {
        apiKeyFields: JSON.stringify(apiKeyFields),
        limits: JSON.stringify(limits),
      },
      create: {
        userId: payload.id,
        apiKeyFields: JSON.stringify(apiKeyFields),
        limits: JSON.stringify(limits),
      },
    });

    logger.api.info(`Settings updated for user ${payload.email}`);
    return NextResponse.json({
      id: updatedSettings.id,
      userId: updatedSettings.userId,
      apiKeyFields: JSON.parse(updatedSettings.apiKeyFields),
      limits: JSON.parse(updatedSettings.limits),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.api.error("Settings update error", { error: message });
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
