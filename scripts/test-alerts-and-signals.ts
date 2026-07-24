import { GET as getTopSignals } from "../app/api/signals/top/route";
import { GET as getAlerts, POST as createAlert, DELETE as deleteAlert } from "../app/api/crypto/alerts/route";

async function runTests() {
  console.log("=================================================");
  console.log("TESTING ALERTS CONTROL & TOP SIGNALS INTEGRATION");
  console.log("=================================================\n");

  // TEST 1: Top Signals Aggregator
  console.log("[1] Testing Top Signals Today...");
  const topRes = await getTopSignals();
  const topJson = await topRes.json();
  console.log(`    Status: ${topRes.status}`);
  console.log(`    Signals Count: ${topJson.topSignals?.length}`);
  if (!topJson.topSignals || topJson.topSignals.length === 0) {
    throw new Error("Top signals failed or returned empty list!");
  }
  console.log(`    ✓ Top Signal #1: ${topJson.topSignals[0].asset} (${topJson.topSignals[0].recommendation}, ${Math.round(topJson.topSignals[0].confidence * 100)}% confidence)`);
  console.log("    ✓ Top Signals test PASSED!\n");

  // TEST 2: Alerts Control API - Create Alert
  console.log("[2] Testing Create Alert (POST /api/crypto/alerts)...");
  const createReq = new Request("http://localhost:3000/api/crypto/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol: "SOL",
      type: "PRICE_ABOVE",
      target: 200,
    }),
  });
  const createRes = await createAlert(createReq);
  const createdJson = await createRes.json();
  console.log(`    Status: ${createRes.status}`);
  console.log(`    Created Alert ID: ${createdJson.id}`);
  if (!createdJson.id) {
    throw new Error(`Create alert failed: ${JSON.stringify(createdJson)}`);
  }
  console.log("    ✓ Create Alert test PASSED!\n");

  // TEST 3: Alerts Control API - Fetch Alerts List
  console.log("[3] Testing Fetch Alerts (GET /api/crypto/alerts)...");
  const listRes = await getAlerts();
  const listJson = await listRes.json();
  console.log(`    Status: ${listRes.status}`);
  console.log(`    Active Alerts Count: ${listJson.length}`);
  const found = listJson.find((a: any) => a.id === createdJson.id);
  if (!found) {
    throw new Error("Created alert not found in active alerts list!");
  }
  console.log(`    ✓ Found Created Alert: ${found.symbol} ${found.type} $${found.target}`);
  console.log("    ✓ Fetch Alerts test PASSED!\n");

  // TEST 4: Alerts Control API - Delete Alert
  console.log("[4] Testing Delete Alert (DELETE /api/crypto/alerts?id=...)...");
  const deleteReq = new Request(`http://localhost:3000/api/crypto/alerts?id=${createdJson.id}`, {
    method: "DELETE",
  });
  const deleteRes = await deleteAlert(deleteReq);
  const deleteJson = await deleteRes.json();
  console.log(`    Status: ${deleteRes.status}`);
  console.log(`    Success: ${deleteJson.success}`);
  if (!deleteJson.success) {
    throw new Error("Delete alert failed!");
  }
  console.log("    ✓ Delete Alert test PASSED!\n");

  console.log("=================================================");
  console.log("ALL ALERTS & TOP SIGNALS TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("❌ Integration Test Error:", err);
  process.exit(1);
});
