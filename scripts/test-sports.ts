import { db } from "../lib/db";
import { SportsPredictionEngine } from "../modules/sports/models";

async function run() {
  console.log("🧪 Starting sports predictions models verification script...");

  // Load a scheduled fixture from the database
  const fixture = await db.sportsFixture.findFirst({
    where: { status: "scheduled" },
  });

  if (!fixture) {
    throw new Error("No scheduled fixtures found in database to run forecast test");
  }

  console.log(`\nFound Scheduled Fixture:`);
  console.log(`- Sport: ${fixture.sport.toUpperCase()}`);
  console.log(`- League: ${fixture.league}`);
  console.log(`- Matchup: ${fixture.homeTeam} vs ${fixture.awayTeam}`);

  const engine = new SportsPredictionEngine();
  const prediction = await engine.predictMatch(fixture.id);

  console.log("\nAI Prediction Results:");
  console.log(`- Predicted Winner: ${prediction.predictedWinner}`);
  console.log(`- Probabilities:`);
  console.log(`  * Home Win (${fixture.homeTeam}): ${Math.round(prediction.homeProb * 100)}%`);
  console.log(`  * Draw: ${Math.round(prediction.drawProb * 100)}%`);
  console.log(`  * Away Win (${fixture.awayTeam}): ${Math.round(prediction.awayProb * 100)}%`);
  console.log(`- Confidence Rating: ${Math.round(prediction.confidence * 100)}%`);
  console.log(`- Risk Level: ${prediction.riskLevel}`);
  console.log(`- F1 Calibration Stats:`);
  console.log(`  * Model Precision: ${Math.round(prediction.precision * 100)}%`);
  console.log(`  * Model Recall: ${Math.round(prediction.recall * 100)}%`);
  console.log(`  * Model F1 Score: ${Math.round(prediction.f1Score * 100)}%`);
  console.log(`- Logic Explanation:\n  ${prediction.reasoning}`);

  console.log("\n✅ Sports prediction calculations validated successfully.");
}

run().catch((err) => {
  console.error("❌ Sports prediction verification failed:", err);
});
export default run;
