import Parser from "rss-parser";
import { db } from "../../lib/db";
import { logger } from "../../lib/logging";

interface RssFeedSource {
  name: string;
  url: string;
}

const FEED_SOURCES: RssFeedSource[] = [
  {
    name: "Yahoo Finance RSS",
    url: "https://finance.yahoo.com/news/rssindex",
  },
  {
    name: "Google News Business",
    url: "https://news.google.com/rss/search?q=business&hl=en-US&gl=US&ceid=US:en",
  },
];

export class RssNewsIngester {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  async fetchAndIngest(tickers: string[]): Promise<any[]> {
    logger.api.info(`Starting RSS news ingestion for tickers: ${tickers.join(", ")}`);
    const newArticles: any[] = [];

    for (const source of FEED_SOURCES) {
      try {
        logger.api.info(`Fetching feed from: ${source.name}`);
        const feed = await this.parser.parseURL(source.url);
        
        for (const item of feed.items) {
          if (!item.title || !item.link) continue;

          // Simple match to see if this article mentions any of our tickers
          const titleLower = item.title.toLowerCase();
          const contentLower = (item.contentSnippet || "").toLowerCase();
          
          const matchedTicker = tickers.find((ticker) => {
            const tk = ticker.toLowerCase();
            return (
              titleLower.includes(` ${tk} `) ||
              titleLower.includes(`(${tk})`) ||
              titleLower.startsWith(`${tk} `) ||
              titleLower.endsWith(` ${tk}`) ||
              contentLower.includes(` ${tk} `) ||
              contentLower.includes(`(${tk})`)
            );
          });

          // If no matched ticker, skip (or optionally keep general market news as macro events)
          if (!matchedTicker) continue;

          try {
            // Check if article exists
            const existing = await db.article.findUnique({
              where: { url: item.link },
            });

            if (!existing) {
              const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
              
              const article = await db.article.create({
                data: {
                  title: item.title,
                  url: item.link,
                  source: source.name,
                  publishedAt,
                  content: item.contentSnippet || item.content || "",
                  ticker: matchedTicker.toUpperCase(),
                },
              });
              
              newArticles.push(article);
              logger.api.info(`Ingested new article: [${matchedTicker}] "${item.title}"`);
            }
          } catch (dbError) {
            const msg = dbError instanceof Error ? dbError.message : String(dbError);
            logger.db.error(`Database error during RSS article save: ${msg}`);
          }
        }
      } catch (feedError) {
        const msg = feedError instanceof Error ? feedError.message : String(feedError);
        logger.api.error(`Failed to parse RSS feed from ${source.name}: ${msg}`);
      }
    }

    logger.api.info(`RSS Ingestion finished. Ingested ${newArticles.length} new articles.`);
    return newArticles;
  }
}
export default RssNewsIngester;
