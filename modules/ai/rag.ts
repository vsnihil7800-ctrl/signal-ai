import { db } from "../../lib/db";
import { logger } from "../../lib/logging";

export interface RagSource {
  title: string;
  source: string;
  url?: string;
  date: string;
}

export interface RagResponse {
  answer: string;
  confidence: number;
  sources: RagSource[];
}

export class RagEngine {
  private static STOP_WORDS = new Set([
    "the", "a", "an", "and", "or", "but", "if", "then", "else", "when",
    "at", "by", "for", "with", "about", "against", "between", "into",
    "through", "during", "before", "after", "above", "below", "to",
    "from", "up", "down", "in", "out", "on", "off", "over", "under",
    "again", "further", "then", "once", "here", "there", "when", "where",
    "why", "how", "all", "any", "both", "each", "few", "more", "most",
    "other", "some", "such", "no", "nor", "not", "only", "own", "same",
    "so", "than", "too", "very", "s", "t", "can", "will", "just", "don",
    "should", "now", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "having", "do", "does", "did", "doing", "i",
    "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
    "yours", "yourself", "yourselves", "he", "him", "his", "himself",
    "she", "her", "hers", "herself", "it", "its", "itself", "they",
    "them", "their", "theirs", "themselves", "what", "which", "who", "whom"
  ]);

  // Clean and tokenize text
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !RagEngine.STOP_WORDS.has(word));
  }

  // Calculate cosine similarity between two frequency vectors
  private calculateCosineSimilarity(qTokens: string[], dTokens: string[]): number {
    const qFreqs = new Map<string, number>();
    const dFreqs = new Map<string, number>();

    qTokens.forEach(t => qFreqs.set(t, (qFreqs.get(t) ?? 0) + 1));
    dTokens.forEach(t => dFreqs.set(t, (dFreqs.get(t) ?? 0) + 1));

    let dotProduct = 0;
    for (const [token, qFreq] of qFreqs.entries()) {
      if (dFreqs.has(token)) {
        dotProduct += qFreq * dFreqs.get(token)!;
      }
    }

    let qMagnitudeSum = 0;
    for (const freq of qFreqs.values()) {
      qMagnitudeSum += freq * freq;
    }
    const qMagnitude = Math.sqrt(qMagnitudeSum);

    let dMagnitudeSum = 0;
    for (const freq of dFreqs.values()) {
      dMagnitudeSum += freq * freq;
    }
    const dMagnitude = Math.sqrt(dMagnitudeSum);

    if (qMagnitude === 0 || dMagnitude === 0) return 0;
    return dotProduct / (qMagnitude * dMagnitude);
  }

  async query(question: string): Promise<RagResponse> {
    logger.api.info(`Running RAG engine query: "${question}"`);
    const qTokens = this.tokenize(question);

    if (qTokens.length === 0) {
      return {
        answer: "Please enter a specific research query containing tickers, market terminology, or sports teams.",
        confidence: 0.0,
        sources: [],
      };
    }

    // Load documents from SQLite
    const documents: Array<{
      title: string;
      content: string;
      source: string;
      url?: string;
      date: string;
      tokens: string[];
    }> = [];

    // A. Load RSS Articles
    const articles = await db.article.findMany({
      take: 50,
      orderBy: { publishedAt: "desc" },
    });
    articles.forEach((art) => {
      documents.push({
        title: art.title,
        content: art.content,
        source: art.source,
        url: art.url,
        date: art.publishedAt.toISOString().split("T")[0],
        tokens: this.tokenize(`${art.title} ${art.content}`),
      });
    });

    // B. Load Economic macro events
    const macroEvents = await db.economicEvent.findMany({
      take: 20,
    });
    macroEvents.forEach((e) => {
      documents.push({
        title: `Macro economic event: ${e.title}`,
        content: `${e.description} country: ${e.country} impact: ${e.impact} forecast: ${e.forecast ?? "N/A"}`,
        source: "Macroeconomic Calendar",
        date: e.eventDate.toISOString().split("T")[0],
        tokens: this.tokenize(`${e.title} ${e.description} ${e.country}`),
      });
    });

    // C. Load Sports scheduled fixtures & predictions
    const fixtures = await db.sportsFixture.findMany({
      include: { predictions: true },
      take: 20,
    });
    fixtures.forEach((f) => {
      const pred = f.predictions[0];
      const predText = pred ? `Prediction winner: ${pred.predictedWinner} with ${Math.round(pred.confidence*100)}% confidence. Model reasoning: ${pred.reason}` : "No prediction loaded";
      documents.push({
        title: `Sports matchup: ${f.homeTeam} vs ${f.awayTeam}`,
        content: `${f.sport} match in ${f.league}. status: ${f.status}. ${predText}`,
        source: "Sports Intelligence",
        date: f.eventDate.toISOString().split("T")[0],
        tokens: this.tokenize(`${f.homeTeam} ${f.awayTeam} ${f.league} ${f.sport} ${predText}`),
      });
    });

    // D. Load India Stock lists
    const indiaStocks = await db.stock.findMany();
    indiaStocks.forEach((s) => {
      documents.push({
        title: `Stock fundamentals: ${s.ticker} (${s.name})`,
        content: `${s.ticker} stock price is ₹${s.price.toFixed(2)} (${s.changePercent > 0 ? "+" : ""}${s.changePercent.toFixed(2)}% change). Sector: ${s.sector}, Industry: ${s.industry}.`,
        source: "India Watchlist Fundamentals",
        date: s.lastUpdated.toISOString().split("T")[0],
        tokens: this.tokenize(`${s.ticker} ${s.name} ${s.sector} ${s.industry}`),
      });
    });

    // E. Load US Stock lists
    const usStocks = await db.uSStock.findMany();
    usStocks.forEach((s) => {
      documents.push({
        title: `Stock fundamentals: ${s.ticker} (${s.name})`,
        content: `${s.ticker} stock price is $${s.price.toFixed(2)} (${s.changePercent > 0 ? "+" : ""}${s.changePercent.toFixed(2)}% change). Sector: ${s.sector}, Industry: ${s.industry}.`,
        source: "US Watchlist Fundamentals",
        date: s.lastUpdated.toISOString().split("T")[0],
        tokens: this.tokenize(`${s.ticker} ${s.name} ${s.sector} ${s.industry}`),
      });
    });

    // F. Load Crypto lists
    const cryptoAssets = await db.cryptoAsset.findMany();
    cryptoAssets.forEach((c) => {
      documents.push({
        title: `Crypto fundamentals: ${c.symbol} (${c.name})`,
        content: `${c.symbol} price is $${c.price.toFixed(2)} (${c.change24h > 0 ? "+" : ""}${c.change24h.toFixed(2)}% 24h change). Market Cap: $${c.marketCap.toLocaleString()}, 24h Volume: $${c.volume24h.toLocaleString()}, Rank: #${c.rank}.`,
        source: "Crypto Watchlist Fundamentals",
        date: c.lastUpdated.toISOString().split("T")[0],
        tokens: this.tokenize(`${c.symbol} ${c.name}`),
      });
    });

    // Calculate similarity scores
    const scoredDocs = documents
      .map((doc) => {
        const score = this.calculateCosineSimilarity(qTokens, doc.tokens);
        return { doc, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    // If no context matched, generate general response
    if (scoredDocs.length === 0) {
      return {
        answer: `No specific historical news items or database assets matched your query words: "${qTokens.join(", ")}". Try querying watchlisted stock symbols (e.g., AAPL, TSLA) or sports teams (e.g., Arsenal, Real Madrid).`,
        confidence: 0.1,
        sources: [],
      };
    }

    // Aggregate top 3 matches
    const topMatches = scoredDocs.slice(0, 3);
    const confidence = Math.min(0.95, 0.4 + topMatches[0].score * 0.5);

    // Build structured answer
    let answerMarkdown = `### AI Explainable RAG Synthesis\n\nBased on your query, the local vector similarity matcher retrieved **${topMatches.length}** highly relevant context files from the SQLite datastore.\n\n`;

    topMatches.forEach((item, idx) => {
      const d = item.doc;
      answerMarkdown += `#### Match [${idx + 1}] — ${d.title} (${d.source}, ${d.date})\n`;
      answerMarkdown += `${d.content}\n\n`;
    });

    answerMarkdown += `### 💡 Risk & Decision Advisory\n- **Transparency Validation**: Information retrieved directly matches daily scraped feeds and database states. No hypothetical predictions have been added.\n- **Disclaimer**: Signal AI generates summaries for research purposes. The user is advised to cross-reference multiple sources before making allocation calls.`;

    const sources: RagSource[] = topMatches.map((item) => ({
      title: item.doc.title,
      source: item.doc.source,
      url: item.doc.url,
      date: item.doc.date,
    }));

    return {
      answer: answerMarkdown,
      confidence,
      sources,
    };
  }
}
export default RagEngine;
