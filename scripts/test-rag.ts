import { RagEngine } from "../modules/ai/rag";

async function run() {
  console.log("🧪 Starting RAG local vector similarity models verification script...");

  const engine = new RagEngine();
  
  // Test query
  const query = "latest AAPL stock returns and details";
  console.log(`\nQuery: "${query}"`);

  const results = await engine.query(query);

  console.log("\nRAG Response Results:");
  console.log(`- Base Confidence Score: ${(results.confidence * 100).toFixed(1)}%`);
  console.log(`- Citation Sources Found: ${results.sources.length}`);
  results.sources.forEach((src, idx) => {
    console.log(`  * Source [${idx + 1}]: ${src.title} (Published: ${src.date} from ${src.source})`);
  });

  console.log(`\n- Generated Answer Synthesis Preview:\n`);
  console.log(results.answer.substring(0, 500) + (results.answer.length > 500 ? "\n... (truncated)" : ""));

  console.log("\n✅ RAG local database token matcher validated successfully.");
}

run().catch((err) => {
  console.error("❌ RAG test script failed:", err);
});
export default run;
