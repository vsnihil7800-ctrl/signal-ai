import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters long").default("super-secret-key-change-in-production-1234567890"),
  PORT: z.string().default("3000").transform((v) => parseInt(v, 10)),
  
  LLM_PROVIDER: z.enum(["gemini", "ollama", "openai-compatible"]).default("ollama"),
  GEMINI_API_KEY: z.string().optional().default(""),
  OLLAMA_HOST: z.string().url().default("http://localhost:11434"),

  ALPHA_VANTAGE_API_KEY: z.string().optional().default(""),
  FINNHUB_API_KEY: z.string().optional().default(""),
  THE_SPORTS_DB_API_KEY: z.string().optional().default("1"),
  FOOTBALL_DATA_API_KEY: z.string().optional().default(""),
  RAPID_API_KEY: z.string().optional().default(""),
  FRED_API_KEY: z.string().optional().default(""),

  REDIS_URL: z.string().optional().default(""),
  
  PAPER_MODE: z.string().default("true").transform((v) => v === "true"),
  JURISDICTION: z.string().default("US"),
  THEME: z.enum(["light", "dark"]).default("dark"),

  // Feature flag environment overrides (optional, default to true except experimental)
  ENABLE_SPORTS_MODULE: z.string().default("true").transform((v) => v !== "false"),
  ENABLE_RAG: z.string().default("true").transform((v) => v !== "false"),
  ENABLE_PORTFOLIO: z.string().default("true").transform((v) => v !== "false"),
  ENABLE_ECONOMIC_CALENDAR: z.string().default("true").transform((v) => v !== "false"),
  ENABLE_EXPERIMENTAL_MODELS: z.string().default("false").transform((v) => v === "true"),
});

// For browser environment, we safely check process.env or fallback to defaults
const getEnv = () => {
  if (typeof window === "undefined") {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error("❌ Invalid environment configuration:", result.error.format());
      throw new Error("Invalid environment configuration");
    }
    return result.data;
  }
  // Safe default for client-side rendering if needed (minimizes bundle size leakage)
  return envSchema.parse({
    DATABASE_URL: "file:./dev.db",
    NODE_ENV: "development",
    JWT_SECRET: "super-secret-key-change-in-production-1234567890",
    PORT: "3000",
    LLM_PROVIDER: "ollama",
    OLLAMA_HOST: "http://localhost:11434",
    THE_SPORTS_DB_API_KEY: "1",
    PAPER_MODE: "true",
    JURISDICTION: "US",
    THEME: "dark",
  });
};

const parsedEnv = getEnv();

export const config = {
  databaseUrl: parsedEnv.DATABASE_URL,
  nodeEnv: parsedEnv.NODE_ENV,
  jwtSecret: parsedEnv.JWT_SECRET,
  port: parsedEnv.PORT,
  llm: {
    provider: parsedEnv.LLM_PROVIDER,
    geminiApiKey: parsedEnv.GEMINI_API_KEY,
    ollamaHost: parsedEnv.OLLAMA_HOST,
  },
  apiKeys: {
    alphaVantage: parsedEnv.ALPHA_VANTAGE_API_KEY,
    finnhub: parsedEnv.FINNHUB_API_KEY,
    theSportsDb: parsedEnv.THE_SPORTS_DB_API_KEY,
    footballData: parsedEnv.FOOTBALL_DATA_API_KEY,
    rapidApi: parsedEnv.RAPID_API_KEY,
    fred: parsedEnv.FRED_API_KEY,
  },
  redisUrl: parsedEnv.REDIS_URL,
  paperMode: parsedEnv.PAPER_MODE,
  jurisdiction: parsedEnv.JURISDICTION,
  theme: parsedEnv.THEME,
  featureFlags: {
    sportsModule: parsedEnv.ENABLE_SPORTS_MODULE,
    rag: parsedEnv.ENABLE_RAG,
    portfolio: parsedEnv.ENABLE_PORTFOLIO,
    paperMode: parsedEnv.PAPER_MODE, // Paper mode is locked to true/false globally via env
    economicCalendar: parsedEnv.ENABLE_ECONOMIC_CALENDAR,
    experimentalModels: parsedEnv.ENABLE_EXPERIMENTAL_MODELS,
  },
  // Free Tier API usage tracking default limits
  rateLimits: {
    alphaVantage: { daily: 25, limitDesc: "25 requests per day" },
    finnhub: { min: 60, limitDesc: "60 requests per minute" },
    theSportsDb: { limitDesc: "Free public test key: '1'" },
    footballData: { limitDesc: "Free tier restrictions" },
    rapidApi: { daily: 100, limitDesc: "100 requests per day" },
    fred: { limitDesc: "Free FRED API limits" },
  }
};
