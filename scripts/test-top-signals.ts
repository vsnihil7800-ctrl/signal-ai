import { GET } from "../app/api/signals/top/route";

async function runTest() {
  console.log("=========================================");
  console.log("TESTING TOP SIGNALS TODAY AGGREGATOR");
  console.log("=========================================\n");

  try {
    const response = await GET();
    const json = await response.json();

    console.log(`✓ Status Code: ${response.status}`);
    console.log(`✓ Last Refreshed: ${json.lastRefreshed}`);
    console.log(`✓ Signals Count Returned: ${json.topSignals.length}\n`);

    if (!json.topSignals || json.topSignals.length === 0) {
      throw new Error("Top signals list is empty!");
    }

    let prevConfidence = 1.0;
    json.topSignals.forEach((sig: any, index: number) => {
      console.log(`[Rank ${index + 1}] [${sig.category}] ${sig.asset} (${sig.symbol})`);
      console.log(`       Signal: ${sig.recommendation} | Confidence: ${Math.round(sig.confidence * 100)}% | Risk: ${sig.riskLevel}`);
      console.log(`       Reasoning: ${sig.reasoning.substring(0, 80)}...`);

      if (sig.confidence > prevConfidence) {
        throw new Error(`Signals are not sorted by confidence descending at index ${index}!`);
      }
      prevConfidence = sig.confidence;
    });

    console.log("\n=========================================");
    console.log("TOP SIGNALS INTEGRATION TEST PASSED!");
    console.log("=========================================");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

runTest();
