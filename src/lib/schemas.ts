import { z } from "zod";

// All free-form arrays are length-capped and per-string-capped, these
// strings end up interpolated into the Claude prompt, so we don't want a
// crafted profile to either inflate token usage or carry jailbreak text.
const tagString = z.string().min(1).max(80).regex(/^[A-Za-z0-9\- _]+$/);

export const sellerProfileSchema = z.object({
  q1: z.enum(["passion", "side", "fulltime", "brand"]),
  q2: z.enum(["1-5", "5-15", "15-30", "30+"]),
  q3: z.enum(["under-100", "100-500", "500-2000", "2000+"]),
  q4: z.enum(["digital", "pod", "made", "stock", "unsure"]),
  q5: z.array(tagString).min(1).max(20),
  q6: z.array(tagString).max(20).optional(),
  q7: z.array(tagString).min(1).max(2),
  q8: z.enum(["30-days", "2-3-months", "6-12-months", "exploring"]),
});

export const subScoresSchema = z.object({
  demand: z.number(),
  competition: z.number(),
  margin: z.number(),
  ltv: z.number(),
  seasonality: z.number(),
  ad_recovery: z.number(),
  policy_penalty: z.number(),
  whitespace_bonus: z.number(),
});

// Permissive on the Claude side, the model often deviates ±1 item or adds
// prose to short fields. Orchestrator slices/normalizes downstream.
export const claudeNicheSchema = z.object({
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(160),
  score: z.number().min(0).max(115),
  sub_scores: subScoresSchema,
  confidence: z.enum(["high", "medium", "low"]),
  missing_signals: z.array(z.string().max(200)).max(12),
  why_this_fits_you: z.string().min(1).max(3000),
  startup_cost: z.string().min(1).max(300),
  time_to_first_sale: z.string().min(1).max(300),
  product_ideas: z.array(z.string().min(1).max(280)).min(3).max(8),
  policy_risk_notes: z.string().max(800).nullable().optional(),
});

export const claudeResponseSchema = z.object({
  niches: z.array(claudeNicheSchema).min(1).max(8),
});

// Shape we save to sessionStorage and read back on /results.
export const generateResponseSchema = z.object({
  source: z.enum(["claude", "mock"]),
  warning: z.string().optional(),
  niches: z
    .array(
      z.object({
        id: z.string(),
        rank: z.number().int(),
        name: z.string(),
        taxonomy: z.array(z.string()),
        inventory_model: z.enum(["digital", "pod", "made", "stock", "unsure"]),
        score: z.number(),
        sub_scores: subScoresSchema,
        confidence: z.enum(["high", "medium", "low"]),
        missing_signals: z.array(z.string()),
        why: z.string(),
        startup_cost: z.string(),
        time_to_first_sale: z.string(),
        product_ideas: z.array(z.string()),
        policy_risk_notes: z.string().nullable().optional(),
        firecrawl: z.object({
          total_listings: z.string(),
          top_10_avg_reviews: z.number(),
          top_10_avg_age_months: z.number(),
          top_10_avg_price: z.string(),
          related_searches: z.array(z.string()),
          signal_unavailable: z.boolean().optional(),
        }),
        hero_img: z.string(),
        tags: z.array(z.string()),
        cf_query: z.string(),
      })
    )
    .min(1)
    .max(3),
});
