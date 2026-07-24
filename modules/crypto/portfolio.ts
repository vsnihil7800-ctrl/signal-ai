import { CryptoQuote, CryptoHistoricalQuote } from "./providers";

export interface CryptoHolding {
  symbol: string;
  name: string;
  amount: number;
  averageCost: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
  weight: number;
}

export interface CryptoPortfolioSummary {
  holdings: CryptoHolding[];
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  portfolioRiskScore: number;
  correlationMatrix: Record<string, Record<string, number>>;
}

export class CryptoPortfolioEngine {
  calculateSummary(
    dbHoldings: Array<{ symbol: string; amount: number; averageCost: number }>,
    quotes: Record<string, CryptoQuote>,
    historyData: Record<string, CryptoHistoricalQuote[]>
  ): CryptoPortfolioSummary {
    let totalValue = 0;
    let totalCost = 0;

    // 1. Map holdings and compute valuations
    const holdings: CryptoHolding[] = dbHoldings.map((h) => {
      const q = quotes[h.symbol.toUpperCase()];
      const currentPrice = q ? q.price : h.averageCost;
      const totalCostVal = h.amount * h.averageCost;
      const currentValue = h.amount * currentPrice;
      const profit = currentValue - totalCostVal;
      const profitPercent = totalCostVal > 0 ? (profit / totalCostVal) * 100 : 0;

      totalValue += currentValue;
      totalCost += totalCostVal;

      return {
        symbol: h.symbol.toUpperCase(),
        name: q ? q.name : h.symbol,
        amount: h.amount,
        averageCost: h.averageCost,
        currentPrice,
        totalCost: totalCostVal,
        currentValue,
        profit,
        profitPercent,
        weight: 0, // calculated below
      };
    });

    // 2. Map weight percentages
    holdings.forEach((h) => {
      h.weight = totalValue > 0 ? h.currentValue / totalValue : 0;
    });

    const totalProfit = totalValue - totalCost;
    const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    // 3. Compute Portfolio Risk Score (weighted sum based on asset changes)
    let weightedRisk = 0;
    holdings.forEach((h) => {
      const q = quotes[h.symbol];
      // high change percent / volatility maps to higher asset risk
      const risk = q ? Math.min(10, Math.max(1, Math.round(Math.abs(q.change24h) * 2))) : 5;
      weightedRisk += risk * h.weight;
    });
    const portfolioRiskScore = parseFloat(weightedRisk.toFixed(1)) || 0;

    // 4. Calculate daily returns & correlation matrix
    const correlationMatrix: Record<string, Record<string, number>> = {};
    const symbols = holdings.map((h) => h.symbol);

    // Seed matrix with 1.0 diagonal
    symbols.forEach((s1) => {
      correlationMatrix[s1] = {};
      symbols.forEach((s2) => {
        correlationMatrix[s1][s2] = s1 === s2 ? 1.0 : 0.0;
      });
    });

    // Compute returns
    const dailyReturns: Record<string, number[]> = {};
    symbols.forEach((sym) => {
      const history = historyData[sym] || [];
      const returns: number[] = [];
      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1].price;
        const curr = history[i].price;
        if (prev > 0) {
          returns.push((curr - prev) / prev);
        }
      }
      dailyReturns[sym] = returns;
    });

    // Calculate Pearson coefficient
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const s1 = symbols[i];
        const s2 = symbols[j];
        const r1 = dailyReturns[s1] || [];
        const r2 = dailyReturns[s2] || [];
        
        // Match lengths
        const len = Math.min(r1.length, r2.length);
        if (len > 3) {
          const mean1 = r1.slice(-len).reduce((a, b) => a + b, 0) / len;
          const mean2 = r2.slice(-len).reduce((a, b) => a + b, 0) / len;
          
          let num = 0;
          let den1 = 0;
          let den2 = 0;
          
          for (let k = 0; k < len; k++) {
            const d1 = r1[r1.length - len + k] - mean1;
            const d2 = r2[r2.length - len + k] - mean2;
            num += d1 * d2;
            den1 += d1 * d1;
            den2 += d2 * d2;
          }
          
          const den = Math.sqrt(den1 * den2);
          const coeff = den > 0 ? num / den : 0;
          const roundedCoeff = parseFloat(coeff.toFixed(3));
          
          correlationMatrix[s1][s2] = roundedCoeff;
          correlationMatrix[s2][s1] = roundedCoeff;
        } else {
          // default fallback correlation
          correlationMatrix[s1][s2] = 0.75;
          correlationMatrix[s2][s1] = 0.75;
        }
      }
    }

    return {
      holdings,
      totalValue,
      totalCost,
      totalProfit,
      totalProfitPercent,
      portfolioRiskScore,
      correlationMatrix,
    };
  }
}
export default CryptoPortfolioEngine;
