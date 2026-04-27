/* Claude client. Builds the system + user prompt per spec § 8 and validates JSON
   output against the Zod schema. Single retry on JSON parse failures. */

import Anthropic from "@anthropic-ai/sdk";
import { claudeResponseSchema } from "@/lib/schemas";
import type { CatalogNiche, FirecrawlSignal, SellerProfile } from "@/lib/types";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2500;

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `You are a niche-research analyst for aspiring Etsy sellers. You produce recommendations only from the candidate niches provided in CONTEXT. You score each on the 8-component framework below and explain your reasoning in the seller's own resource terms. You never invent search volumes, seller revenues, or trends. When a signal is missing, you say so.

Scoring framework (sum to 0–100, with adjustments):
  Demand             , up to 25 points
  Competition (inv)  , up to 20 points
  Margin economics   , up to 20 points
  Repeat / LTV       , up to 10 points
  Seasonality        , up to 10 points
  Ad cost recovery   , up to 10 points
  Policy risk penalty, up to −15 points
  Whitespace bonus   , up to +15 points

Decision thresholds: 80+ enter, 60–79 viable, 40–59 risky, <40 avoid.

Hard rules:
- Recommend only from the candidates provided. Do not invent niches.
- Reference at least 2 specific seller profile inputs in each "why this fits you".
- Reference at least 1 specific Firecrawl signal in each recommendation.
- If Firecrawl data is missing for a candidate, score with reduced confidence and state which signals were unavailable.
- Never recommend niches with active policy_risk_flags.
- Aesthetic match must overlap the seller's top-2 aesthetic picks. If no candidates overlap, recommend the closest and flag the mismatch honestly.

Voice: confident but warm. Editorial, not hype. No "skyrocket", "crush", "dominate". Short paragraphs.

Output format: JSON only. No prose before or after the JSON object. The JSON must match this schema exactly:
{
  "niches": [
    {
      "id": string,
      "name": string,
      "score": number,
      "sub_scores": {
        "demand": number, "competition": number, "margin": number,
        "ltv": number, "seasonality": number, "ad_recovery": number,
        "policy_penalty": number, "whitespace_bonus": number
      },
      "confidence": "high" | "medium" | "low",
      "missing_signals": [string],
      "why_this_fits_you": string,
      "startup_cost": string,
      "time_to_first_sale": string,
      "product_ideas": [string, string, string, string, string],
      "policy_risk_notes": string | null
    }
  ]
}

Return the top 3 candidates by score, in score order.`;

function buildUserPrompt(
  profile: SellerProfile,
  candidates: { niche: CatalogNiche; signal: FirecrawlSignal | null }[]
): string {
  const profileBlock = `SELLER PROFILE
Goal:               ${profile.q1}
Hours/week:         ${profile.q2}
Starting budget:    ${profile.q3}
Inventory model:    ${profile.q4}
Skills:             ${profile.q5.join(", ")}
Equipment:          ${(profile.q6 ?? []).join(", ") || "none"}
Top-2 aesthetic:    ${profile.q7.join(", ")}
Timeline:           ${profile.q8}`;

  const candidatesBlock = candidates
    .map(({ niche, signal }, i) => {
      const fcLines = signal
        ? `      total_listings: ${signal.total_listings}
      top_10_avg_reviews: ${signal.top_10_avg_reviews}
      top_10_avg_age_months: ${signal.top_10_avg_age_months}
      top_10_avg_price: ${signal.top_10_avg_price}
      related_searches: [${signal.related_searches.map((s) => `"${s}"`).join(", ")}]`
        : `      signal_unavailable: true`;

      return `Candidate ${i + 1}:
  id: ${niche.id}
  name: ${niche.name}
  etsy_taxonomy: ${niche.etsy_taxonomy.join(" / ")}
  inventory_models: ${niche.inventory_models.join(", ")}
  aesthetic_clusters: ${niche.aesthetic_clusters.join(", ")}
  typical_price_range: $${niche.typical_price_range[0]}–${niche.typical_price_range[1]}
  modeled_net_margin_pct: ${(niche.modeled_net_margin_pct * 100).toFixed(0)}%
  seasonality_index_q4: ${niche.seasonality_index_q4}
  seasonality_year_round: ${niche.seasonality_year_round}
  policy_risk_flags: [${niche.policy_risk_flags.join(", ") || "none"}]
  FIRECRAWL DATA (live):
${fcLines}`;
    })
    .join("\n\n");

  return `${profileBlock}

CANDIDATE NICHES (${candidates.length} candidates, pre-filtered by inventory_model + equipment)

${candidatesBlock}

TASK
1. Filter by hard rules (aesthetic overlap, policy risk).
2. Score each remaining candidate 0–100 with sub-scores.
3. Return the top 3 in score order.
4. For each, write a 90–120 word "why_this_fits_you" referencing ≥2 profile inputs and ≥1 Firecrawl signal.
5. For each, give a startup_cost estimate, time_to_first_sale, and 5 product_ideas tuned to the seller's top-2 aesthetic.

Output JSON only. Begin output with { and end with }.`;
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return text;
  return text.slice(start, end + 1);
}

export type ClaudeNicheOutput = {
  id: string;
  name: string;
  score: number;
  sub_scores: {
    demand: number;
    competition: number;
    margin: number;
    ltv: number;
    seasonality: number;
    ad_recovery: number;
    policy_penalty: number;
    whitespace_bonus: number;
  };
  confidence: "high" | "medium" | "low";
  missing_signals: string[];
  why_this_fits_you: string;
  startup_cost: string;
  time_to_first_sale: string;
  product_ideas: string[];
  policy_risk_notes?: string | null;
};

export async function generateNiches(
  profile: SellerProfile,
  candidates: { niche: CatalogNiche; signal: FirecrawlSignal | null }[]
): Promise<ClaudeNicheOutput[] | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const userPrompt = buildUserPrompt(profile, candidates);

  const callOnce = async (temperature: number): Promise<string | null> => {
    try {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
      });

      return msg.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[claude] API call failed (temp=${temperature}):`, message);
      return null;
    }
  };

  // First attempt
  let raw = await callOnce(0.4);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    // Retry once at lower temperature
    const retry = await callOnce(0.2);
    if (retry === null) return null;
    raw = retry;
    try {
      parsed = JSON.parse(extractJson(raw));
    } catch (err) {
      console.error("[claude] JSON parse failed twice:", err);
      return null;
    }
  }

  const validation = claudeResponseSchema.safeParse(parsed);
  if (!validation.success) {
    console.error("[claude] schema validation failed:", validation.error.issues);
    return null;
  }

  return validation.data.niches;
}
