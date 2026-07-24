import { analyzeSentiment } from "../modules/ai/finbert";

async function run() {
  console.log("🧪 Starting FinBERT verification test script...");
  
  const testCases = [
    "Microsoft reports record-breaking revenue growth driven by cloud business",
    "Tesla stock plunges as deliveries drop drastically in the second quarter",
    "Apple Inc. held its annual shareholder meeting yesterday in Cupertino",
  ];

  for (const text of testCases) {
    console.log(`\nAnalyzing text: "${text}"`);
    const start = Date.now();
    const result = await analyzeSentiment(text);
    const duration = Date.now() - start;
    console.log(`Prediction: ${result.sentiment.toUpperCase()} (Confidence: ${Math.round(result.score * 100)}%)`);
    console.log(`Execution Time: ${duration}ms`);
  }
}

run().catch((err) => {
  console.error("❌ FinBERT test failed:", err);
});
export default run;
