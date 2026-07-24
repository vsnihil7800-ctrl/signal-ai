import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SportsPredictionEngine } from "@/modules/sports/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fixtureId = body.fixtureId;

    if (!fixtureId) {
      return NextResponse.json({ error: "Missing fixtureId parameter" }, { status: 400 });
    }

    const engine = new SportsPredictionEngine();
    const prediction = await engine.predictMatch(fixtureId);

    // Save or update the prediction in the DB
    const existing = await db.prediction.findFirst({
      where: { fixtureId },
    });

    let savedPrediction;
    if (existing) {
      savedPrediction = await db.prediction.update({
        where: { id: existing.id },
        data: {
          predictedWinner: prediction.predictedWinner,
          homeProb: prediction.homeProb,
          awayProb: prediction.awayProb,
          drawProb: prediction.drawProb,
          confidence: prediction.confidence,
          riskLevel: prediction.riskLevel,
          reason: prediction.reasoning,
          precision: prediction.precision,
          recall: prediction.recall,
          f1Score: prediction.f1Score,
        },
      });
    } else {
      savedPrediction = await db.prediction.create({
        data: {
          fixtureId,
          predictedWinner: prediction.predictedWinner,
          homeProb: prediction.homeProb,
          awayProb: prediction.awayProb,
          drawProb: prediction.drawProb,
          confidence: prediction.confidence,
          riskLevel: prediction.riskLevel,
          reason: prediction.reasoning,
          precision: prediction.precision,
          recall: prediction.recall,
          f1Score: prediction.f1Score,
          calibrationScore: 0.85,
          numSamples: 100,
          trainingWindow: "5-match form history",
        },
      });
    }

    return NextResponse.json(savedPrediction);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg || "Failed to generate sports match prediction" },
      { status: 500 }
    );
  }
}
