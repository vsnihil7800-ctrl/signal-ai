import { db } from "../db";
import { config } from "../config";
import { logger } from "../logging";

export class RateLimitError extends Error {
  constructor(apiName: string, limit: number) {
    super(`Rate limit exceeded for API "${apiName}" (Limit: ${limit})`);
    this.name = "RateLimitError";
  }
}

export async function checkAndIncrementUsage(apiName: string, endpoint: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  
  const limitConfig = (config.rateLimits as Record<string, { daily?: number; limitDesc?: string }>)[apiName.toLowerCase()] || { daily: 100 };
  const dailyLimit = limitConfig.daily ?? 100;

  try {
    const usage = await db.aPIUsage.findFirst({
      where: {
        apiName,
        date: today,
      },
    });

    if (usage) {
      if (usage.requestsUsed >= usage.requestLimit) {
        logger.api.warn(`Rate limit warning: ${apiName} cap reached (${usage.requestsUsed}/${usage.requestLimit})`);
        throw new RateLimitError(apiName, usage.requestLimit);
      }

      await db.aPIUsage.update({
        where: { id: usage.id },
        data: { requestsUsed: { increment: 1 } },
      });
    } else {
      await db.aPIUsage.create({
        data: {
          apiName,
          endpoint,
          requestsUsed: 1,
          requestLimit: dailyLimit,
          date: today,
        },
      });
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    const msg = error instanceof Error ? error.message : String(error);
    logger.db.error(`Failed to update API usage metrics: ${msg}`);
  }
}
