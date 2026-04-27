/* Firecrawl v4 client. Etsy aggressively bot-blocks direct scrapes (even with
 * stealth proxy), so we pivot to Firecrawl's search() endpoint instead, it
 * hits Google search and returns SERP results, which lets us measure Etsy's
 * presence in a niche without scraping Etsy directly.
 *
 * Signals we surface to Claude:
 *   total_listings    → "N of 20 Google results on Etsy"
 *   related_searches  → frequent multi-word phrases pulled from result titles
 *   price/reviews/age → marked unavailable (would need direct listing scrapes)
 *
 * 24h cache TTL. Returns null on failure so the caller can pass
 * signal_unavailable to Claude. */

import Firecrawl from "@mendable/firecrawl-js";
import { getCached, setCached } from "@/lib/cache";
import type { FirecrawlSignal } from "@/lib/types";

const TTL_SECONDS = 24 * 60 * 60;
const SEARCH_LIMIT = 20;

let client: Firecrawl | null = null;

function getClient(): Firecrawl | null {
  if (!process.env.FIRECRAWL_API_KEY) return null;
  if (!client) client = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
  return client;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "with", "from", "in", "on",
  "of", "to", "by", "as", "at", "is", "are", "this", "that", "your", "you",
  "etsy", "shop", "best", "top", "buy", "online", "shipping", "free", "sale",
]);

function deriveRelatedSearches(titles: string[]): string[] {
  const phrases = new Map<string, number>();
  for (const title of titles) {
    const tokens = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t));
    // 2–3 word n-grams
    for (let i = 0; i < tokens.length - 1; i++) {
      const bg = `${tokens[i]} ${tokens[i + 1]}`;
      phrases.set(bg, (phrases.get(bg) ?? 0) + 1);
      if (i < tokens.length - 2) {
        const tg = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
        phrases.set(tg, (phrases.get(tg) ?? 0) + 1);
      }
    }
  }
  return Array.from(phrases.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([phrase]) => phrase);
}

export async function scrapeEtsySearch(query: string): Promise<FirecrawlSignal | null> {
  const cacheKey = `signal:${query}`;
  const cached = await getCached<FirecrawlSignal>(cacheKey);
  if (cached) return cached;

  const fc = getClient();
  if (!fc) return null;

  try {
    const res = await fc.search(query, {
      sources: ["web"],
      limit: SEARCH_LIMIT,
      timeout: 30000,
    });

    const webResults = res?.web ?? [];
    if (webResults.length === 0) {
      console.warn(`[firecrawl] search returned 0 results for "${query}"`);
      return null;
    }

    type Result = { url?: string; title?: string; description?: string };
    const items = webResults as Result[];

    const etsyResults = items.filter(
      (r) => typeof r.url === "string" && /(?:^|\.)etsy\.com\//i.test(r.url)
    );

    const allTitles = items
      .map((r) => `${r.title ?? ""} ${r.description ?? ""}`.trim())
      .filter(Boolean);

    const related = deriveRelatedSearches(allTitles);

    const signal: FirecrawlSignal = {
      total_listings: `${etsyResults.length} / ${items.length} top results on Etsy`,
      top_10_avg_reviews: 0,
      top_10_avg_age_months: 0,
      top_10_avg_price: "n/a",
      related_searches: related,
      signal_unavailable: etsyResults.length === 0,
    };

    await setCached(cacheKey, signal, TTL_SECONDS);
    return signal;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[firecrawl] search failed for "${query}":`, message);
    return null;
  }
}
