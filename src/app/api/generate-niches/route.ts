/* POST /api/generate-niches
 * Orchestrates: filter candidates → Firecrawl in parallel → Claude → return top 3.
 * Falls back to mock data when API keys are missing or upstream fails. */

import type { NextRequest } from "next/server";
import { sellerProfileSchema } from "@/lib/schemas";
import { filterCandidates } from "@/lib/candidates";
import { scrapeEtsySearch } from "@/lib/firecrawl";
import { generateNiches, type ClaudeNicheOutput } from "@/lib/claude";
import { MOCK_RESPONSE } from "@/lib/mock";
import { NICHE_CATALOG } from "@/data/catalog";
import type {
  GenerateResponse,
  ResultNiche,
  CatalogNiche,
  FirecrawlSignal,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fallback hero image used only when a Claude output references an id that
// isn't in the catalog (shouldn't happen, system prompt forbids inventing).
const FALLBACK_HERO_IMG =
  "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=1200&q=80&auto=format&fit=crop";

const INVENTORY_LABEL: Record<string, string> = {
  digital: "Digital",
  pod: "Print-on-demand",
  made: "Handmade",
  stock: "In-stock",
  unsure: "Mixed",
};

function buildResultNiche(
  output: ClaudeNicheOutput,
  rank: number,
  catalogEntry: CatalogNiche | undefined,
  signal: FirecrawlSignal | null
): ResultNiche {
  const inventory = catalogEntry?.inventory_models[0] ?? "digital";
  const tags = catalogEntry
    ? [
        INVENTORY_LABEL[inventory] ?? "Digital",
        ...catalogEntry.aesthetic_clusters.slice(0, 3).map(
          (c) => c.charAt(0).toUpperCase() + c.slice(1)
        ),
      ]
    : ["Digital"];

  return {
    id: output.id,
    rank,
    name: output.name,
    taxonomy: catalogEntry?.etsy_taxonomy ?? ["Etsy"],
    inventory_model: inventory,
    score: output.score,
    sub_scores: output.sub_scores,
    confidence: output.confidence,
    missing_signals: output.missing_signals,
    why: output.why_this_fits_you,
    startup_cost: output.startup_cost,
    time_to_first_sale: output.time_to_first_sale,
    product_ideas: output.product_ideas,
    policy_risk_notes: output.policy_risk_notes ?? null,
    firecrawl: signal ?? {
      total_listings: "n/a",
      top_10_avg_reviews: 0,
      top_10_avg_age_months: 0,
      top_10_avg_price: "n/a",
      related_searches: [],
      signal_unavailable: true,
    },
    hero_img: catalogEntry?.hero_img ?? FALLBACK_HERO_IMG,
    tags,
    cf_query: catalogEntry?.cf_query ?? output.name,
  };
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = sellerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_profile", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const profile = parsed.data;

  const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY;
  const hasFirecrawlKey = !!process.env.FIRECRAWL_API_KEY;

  // Without Claude key we can't synthesize. Return mock with a warning so the UI works.
  if (!hasClaudeKey) {
    const res: GenerateResponse = { ...MOCK_RESPONSE };
    return Response.json(res);
  }

  // Pre-filter candidates by code (spec § 7 step 4)
  const candidates = filterCandidates(profile, 8);

  if (candidates.length === 0) {
    const res: GenerateResponse = {
      ...MOCK_RESPONSE,
      warning: "No catalog matches found for the provided profile. Showing demo recommendations.",
    };
    return Response.json(res);
  }

  // Firecrawl in parallel (or skip if no key, Claude still gets candidate metadata)
  const signals: (FirecrawlSignal | null)[] = await Promise.all(
    candidates.map((n) =>
      hasFirecrawlKey ? scrapeEtsySearch(n.default_search_query) : Promise.resolve(null)
    )
  );

  const candidatesWithSignals = candidates.map((niche, i) => ({
    niche,
    signal: signals[i],
  }));

  // Claude synthesis
  const claudeOutput = await generateNiches(profile, candidatesWithSignals);

  if (!claudeOutput) {
    return Response.json(
      {
        ...MOCK_RESPONSE,
        warning: "AI synthesis failed, showing demo recommendations. Try again in a moment.",
      } satisfies GenerateResponse,
      { status: 200 }
    );
  }

  // Map Claude's output back to result niches enriched with catalog + Firecrawl data
  const niches: ResultNiche[] = claudeOutput.slice(0, 3).map((output, idx) => {
    const catalogEntry = NICHE_CATALOG.find((c) => c.id === output.id);
    const signalIdx = candidates.findIndex((c) => c.id === output.id);
    const signal = signalIdx >= 0 ? signals[signalIdx] : null;
    return buildResultNiche(output, idx + 1, catalogEntry, signal);
  });

  const warning =
    !hasFirecrawlKey
      ? "Firecrawl key not set, recommendations are scored without live Etsy data."
      : undefined;

  const response: GenerateResponse = {
    niches,
    source: "claude",
    ...(warning ? { warning } : {}),
  };

  return Response.json(response);
}
