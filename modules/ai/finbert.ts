import { pipeline } from "@xenova/transformers";
import { logger } from "../../lib/logging";

let classifier: any = null;
let useFallbackLexicon = false;

// Positive and negative financial lexicons for local offline fallback
const POSITIVE_WORDS = [
  "growth", "breakout", "record", "surge", "breakthrough", "profit", "up", "gain",
  "higher", "bullish", "positive", "beat", "upgrade", "success", "expand", "boost",
  "exceed", "outperform", "rally", "recovery", "revival", "soar", "dividend", "earnings"
];

const NEGATIVE_WORDS = [
  "plunge", "drop", "fall", "decline", "loss", "slump", "down", "lower", "bearish",
  "negative", "miss", "downgrade", "failure", "deficit", "suspend", "warnings", "plummets",
  "sink", "slashed", "shrink", "contraction", "debt", "lawsuit", "disaster", "bankruptcy"
];

function analyzeLexiconSentiment(text: string): SentimentClassificationResult {
  const words = text.toLowerCase().split(/\W+/);
  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.includes(word)) positiveCount++;
    else if (NEGATIVE_WORDS.includes(word)) negativeCount++;
  }

  const total = positiveCount + negativeCount;
  if (total === 0) {
    return { sentiment: "neutral", score: 0.5 };
  }

  const diff = positiveCount - negativeCount;
  if (diff > 0) {
    return { sentiment: "positive", score: 0.5 + (positiveCount / total) * 0.5 };
  } else if (diff < 0) {
    return { sentiment: "negative", score: 0.5 + (negativeCount / total) * 0.5 };
  } else {
    return { sentiment: "neutral", score: 0.5 };
  }
}

export async function getFinbertClassifier() {
  if (useFallbackLexicon) return null;
  
  if (!classifier) {
    logger.ai.info("Initializing local FinBERT model pipeline (WASM). This may take a few seconds on first run...");
    try {
      classifier = await pipeline("text-classification", "Xenova/finbert");
      logger.ai.info("Local FinBERT pipeline initialized successfully.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.ai.error(`Failed to initialize local FinBERT pipeline: ${msg}. Switching to offline lexicon-based analyzer.`);
      useFallbackLexicon = true;
      return null;
    }
  }
  return classifier;
}

export interface SentimentClassificationResult {
  sentiment: "positive" | "negative" | "neutral";
  score: number;
}

export async function analyzeSentiment(text: string): Promise<SentimentClassificationResult> {
  try {
    const model = await getFinbertClassifier();
    
    if (useFallbackLexicon || !model) {
      const result = analyzeLexiconSentiment(text);
      logger.ai.info(`Lexicon Classified (Offline Fallback): "${text.substring(0, 50)}..." -> ${result.sentiment} (${Math.round(result.score * 100)}%)`);
      return result;
    }

    const truncatedText = text.substring(0, 1000);
    const output = await model(truncatedText);
    if (!output || output.length === 0) {
      throw new Error("Model returned empty prediction output");
    }

    const { label, score } = output[0];
    const sentiment = label.toLowerCase() as "positive" | "negative" | "neutral";

    logger.ai.info(`FinBERT Classified: "${text.substring(0, 50)}..." -> ${sentiment} (${Math.round(score * 100)}%)`);
    
    return {
      sentiment,
      score,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.ai.error(`FinBERT classification failed: ${msg}. Using offline lexicon analyzer fallback.`);
    return analyzeLexiconSentiment(text);
  }
}
export default analyzeSentiment;
