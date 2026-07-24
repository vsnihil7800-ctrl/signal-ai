import winston from "winston";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";
const logsDir = path.join(process.cwd(), "logs");

// Custom format for clean console logs
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, category, ...meta }) => {
    const cat = category ? `[${category}] ` : "";
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}: ${cat}${message}${metaStr}`;
  })
);

// Format for file logs (JSON format)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const createWinstonLogger = (category: string, filename: string) => {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ];

  // Only write to files in development (since cloud hosting environments like Vercel have read-only file systems)
  if (isDev) {
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, filename),
        format: fileFormat,
        level: "info",
      }),
      new winston.transports.File({
        filename: path.join(logsDir, "error.log"),
        format: fileFormat,
        level: "error",
      })
    );
  }

  return winston.createLogger({
    level: "info",
    defaultMeta: { category },
    transports,
  });
};

// Create category-specific loggers
const apiLogger = createWinstonLogger("API", "api.log");
const workerLogger = createWinstonLogger("WORKER", "worker.log");
const aiLogger = createWinstonLogger("AI", "ai.log");
const dbLogger = createWinstonLogger("DATABASE", "db.log");

export const logger = {
  api: {
    info: (msg: string, meta?: Record<string, unknown>) => apiLogger.info(msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => apiLogger.warn(msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => apiLogger.error(msg, meta),
  },
  worker: {
    info: (msg: string, meta?: Record<string, unknown>) => workerLogger.info(msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => workerLogger.warn(msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => workerLogger.error(msg, meta),
  },
  ai: {
    info: (msg: string, meta?: Record<string, unknown>) => aiLogger.info(msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => aiLogger.warn(msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => aiLogger.error(msg, meta),
  },
  db: {
    info: (msg: string, meta?: Record<string, unknown>) => dbLogger.info(msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => dbLogger.warn(msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => dbLogger.error(msg, meta),
  },
};
