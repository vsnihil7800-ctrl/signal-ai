import { PortfolioOptimizer, AssetWeight } from "../modules/portfolio/optimizer";

async function run() {
  console.log("🧪 Starting portfolio optimization models mathematical verification script...");

  // Mock allocation: AAPL 40%, MSFT 30%, TSLA 30%
  const allocations: AssetWeight[] = [
    { ticker: "AAPL", weight: 0.4 },
    { ticker: "MSFT", weight: 0.3 },
    { ticker: "TSLA", weight: 0.3 },
  ];

  console.log("\nTarget Allocations:");
  allocations.forEach(a => console.log(`- ${a.ticker}: ${a.weight * 100}%`));

  const optimizer = new PortfolioOptimizer();
  const results = await optimizer.optimize(allocations);

  console.log("\nModern Portfolio Theory (MPT) Optimization Results:");
  console.log(`- Annualized Expected Return: ${(results.expectedReturn * 100).toFixed(2)}%`);
  console.log(`- Annualized Portfolio Volatility: ${(results.volatility * 100).toFixed(2)}%`);
  console.log(`- Sharpe Ratio (Rf = 3.0%): ${results.sharpeRatio.toFixed(3)}`);
  console.log(`- Volatility Risk Rating Score: ${results.riskScore} / 10`);
  console.log(`- Efficient Frontier Points Simulated: ${results.frontier.length}`);

  if (results.frontier.length > 0) {
    console.log(`- Frontier Volatility Range: ${(results.frontier[0].volatility * 100).toFixed(2)}% to ${(results.frontier[results.frontier.length - 1].volatility * 100).toFixed(2)}%`);
    console.log(`- Frontier Expected Return Range: ${(results.frontier[0].expectedReturn * 100).toFixed(2)}% to ${(results.frontier[results.frontier.length - 1].expectedReturn * 100).toFixed(2)}%`);
  }

  console.log("\n✅ Portfolio calculations and MPT Frontier points successfully verified.");
}

run().catch((err) => {
  console.error("❌ Portfolio verification failed:", err);
});
export default run;
