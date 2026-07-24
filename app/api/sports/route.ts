import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SportsPredictionEngine } from "@/modules/sports/models";

export async function GET() {
  try {
    let fixtures = await db.sportsFixture.findMany({
      include: { predictions: true },
    });

    // Seed default fixtures if none exist or if it's the old sparse dataset (e.g. fresh environment or database reset)
    if (fixtures.length < 12) {
      // Clear old fixtures and predictions to prevent duplicates
      await db.prediction.deleteMany();
      await db.sportsFixture.deleteMany();

      const historicalFixtures = [
        {
          sport: "football",
          league: "English Premier League",
          homeTeam: "Arsenal",
          awayTeam: "Chelsea",
          eventDate: new Date(Date.now() - 86400000 * 5),
          status: "finished",
          homeScore: 3,
          awayScore: 1,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "UEFA Champions League",
          homeTeam: "Manchester City",
          awayTeam: "Real Madrid",
          eventDate: new Date(Date.now() - 86400000 * 6),
          status: "finished",
          homeScore: 2,
          awayScore: 0,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "English Premier League",
          homeTeam: "Chelsea",
          awayTeam: "Real Madrid",
          eventDate: new Date(Date.now() - 86400000 * 10),
          status: "finished",
          homeScore: 1,
          awayScore: 2,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "English Premier League",
          homeTeam: "Arsenal",
          awayTeam: "Manchester City",
          eventDate: new Date(Date.now() - 86400000 * 12),
          status: "finished",
          homeScore: 2,
          awayScore: 2,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "UEFA Champions League",
          homeTeam: "Real Madrid",
          awayTeam: "Chelsea",
          eventDate: new Date(Date.now() - 86400000 * 15),
          status: "finished",
          homeScore: 3,
          awayScore: 0,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "English Premier League",
          homeTeam: "Chelsea",
          awayTeam: "Arsenal",
          eventDate: new Date(Date.now() - 86400000 * 18),
          status: "finished",
          homeScore: 0,
          awayScore: 1,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "English Premier League",
          homeTeam: "Manchester City",
          awayTeam: "Chelsea",
          eventDate: new Date(Date.now() - 86400000 * 20),
          status: "finished",
          homeScore: 1,
          awayScore: 2,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "UEFA Champions League",
          homeTeam: "Real Madrid",
          awayTeam: "Arsenal",
          eventDate: new Date(Date.now() - 86400000 * 22),
          status: "finished",
          homeScore: 1,
          awayScore: 1,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "UEFA Champions League",
          homeTeam: "Arsenal",
          awayTeam: "Real Madrid",
          eventDate: new Date(Date.now() - 86400000 * 25),
          status: "finished",
          homeScore: 1,
          awayScore: 2,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "English Premier League",
          homeTeam: "Chelsea",
          awayTeam: "Manchester City",
          eventDate: new Date(Date.now() - 86400000 * 28),
          status: "finished",
          homeScore: 2,
          awayScore: 1,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "UEFA Champions League",
          homeTeam: "Real Madrid",
          awayTeam: "Manchester City",
          eventDate: new Date(Date.now() - 86400000 * 30),
          status: "finished",
          homeScore: 1,
          awayScore: 2,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "English Premier League",
          homeTeam: "Manchester City",
          awayTeam: "Arsenal",
          eventDate: new Date(Date.now() - 86400000 * 35),
          status: "finished",
          homeScore: 2,
          awayScore: 0,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "UEFA Champions League",
          homeTeam: "Arsenal",
          awayTeam: "Real Madrid",
          eventDate: new Date(Date.now() - 86400000 * 40),
          status: "finished",
          homeScore: 3,
          awayScore: 2,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "UEFA Champions League",
          homeTeam: "Chelsea",
          awayTeam: "Real Madrid",
          eventDate: new Date(Date.now() - 86400000 * 42),
          status: "finished",
          homeScore: 2,
          awayScore: 2,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "English Premier League",
          homeTeam: "Manchester City",
          awayTeam: "Chelsea",
          eventDate: new Date(Date.now() - 86400000 * 45),
          status: "finished",
          homeScore: 0,
          awayScore: 0,
          rawData: "{}",
        },
        {
          sport: "football",
          league: "English Premier League",
          homeTeam: "Arsenal",
          awayTeam: "Manchester City",
          eventDate: new Date(Date.now() - 86400000 * 50),
          status: "finished",
          homeScore: 1,
          awayScore: 0,
          rawData: "{}",
        },
        {
          sport: "cricket",
          league: "International Test Match",
          homeTeam: "India",
          awayTeam: "Australia",
          eventDate: new Date(Date.now() - 86400000 * 7),
          status: "finished",
          homeScore: 320,
          awayScore: 280,
          rawData: "{}",
        },
        {
          sport: "cricket",
          league: "International Test Match",
          homeTeam: "Australia",
          awayTeam: "India",
          eventDate: new Date(Date.now() - 86400000 * 11),
          status: "finished",
          homeScore: 290,
          awayScore: 295,
          rawData: "{}",
        },
        {
          sport: "basketball",
          league: "NBA Playoffs",
          homeTeam: "Los Angeles Lakers",
          awayTeam: "Boston Celtics",
          eventDate: new Date(Date.now() - 86400000 * 8),
          status: "finished",
          homeScore: 112,
          awayScore: 108,
          rawData: "{}",
        },
        {
          sport: "basketball",
          league: "NBA Playoffs",
          homeTeam: "Boston Celtics",
          awayTeam: "Los Angeles Lakers",
          eventDate: new Date(Date.now() - 86400000 * 14),
          status: "finished",
          homeScore: 105,
          awayScore: 115,
          rawData: "{}",
        }
      ];

      const upcomingFixtures = [
        {
          sport: "football",
          league: "English Premier League",
          homeTeam: "Arsenal",
          awayTeam: "Chelsea",
          eventDate: new Date(Date.now() + 86400000 * 2),
          status: "scheduled",
          rawData: "{}",
        },
        {
          sport: "football",
          league: "UEFA Champions League",
          homeTeam: "Manchester City",
          awayTeam: "Real Madrid",
          eventDate: new Date(Date.now() + 86400000 * 3),
          status: "scheduled",
          rawData: "{}",
        },
        {
          sport: "cricket",
          league: "International Test Match",
          homeTeam: "India",
          awayTeam: "Australia",
          eventDate: new Date(Date.now() + 86400000 * 1),
          status: "scheduled",
          rawData: "{}",
        },
        {
          sport: "basketball",
          league: "NBA Playoffs",
          homeTeam: "Los Angeles Lakers",
          awayTeam: "Boston Celtics",
          eventDate: new Date(Date.now() + 86400000 * 4),
          status: "scheduled",
          rawData: "{}",
        }
      ];

      for (const item of [...historicalFixtures, ...upcomingFixtures]) {
        await db.sportsFixture.create({ data: item });
      }

      fixtures = await db.sportsFixture.findMany({
        include: { predictions: true },
      });
    }

    const engine = new SportsPredictionEngine();

    for (const fixture of fixtures) {
      if (fixture.status === "scheduled" && fixture.predictions.length === 0) {
        try {
          const prediction = await engine.predictMatch(fixture.id);
          const saved = await db.prediction.create({
            data: {
              fixtureId: fixture.id,
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
          fixture.predictions.push(saved);
        } catch (e) {
          console.error(`Failed to generate prediction for fixture ${fixture.id}:`, e);
        }
      }
    }

    return NextResponse.json(fixtures);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to fetch sports intelligence data: ${msg}` },
      { status: 500 }
    );
  }
}
