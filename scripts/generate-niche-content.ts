/**
 * One-shot batch: for every entry in NICHE_CATALOG, ask Claude Sonnet 4.6
 * for the prose fields needed by the per-niche guide page (NicheContent),
 * validate against the Zod schema, and write the merged map to
 * src/data/niche-content.ts as a TypeScript literal.
 *
 * Run via:  npm run generate:niche-content
 *
 * Cost: ~25 niches × ~1.5K input + ~600 output tokens ≈ a few cents.
 */

// Match Next.js's env-file precedence: .env.local first (wins), then .env.
// dotenv won't override an already-set var, so the order matters.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { NICHE_CATALOG } from "../src/data/catalog";
import { nicheContentSchema } from "../src/lib/schemas";
import type { CatalogNiche, NicheContent, NicheContentMap } from "../src/lib/types";

const MODEL = "claude-sonnet-4-6";
// Output budget: ~500 words ≈ 800 tokens of prose + JSON overhead. 2000 leaves
// comfortable headroom; truncation on a wordy niche would silently produce
// invalid JSON because extractJson grabs the last `}` regardless.
const MAX_TOKENS = 2000;
const OUT_PATH = resolve(process.cwd(), "src/data/niche-content.ts");

const SYSTEM_PROMPT = `You are a niche-research analyst writing static guide-page copy for an Etsy-niche-finder app called nichefinder.

For each niche I give you, return a JSON object with these fields:

  description           80-100 words. Plain-English what this niche is. Lead with what the buyer wants.
  who_this_is_for       80-100 words. The seller profile that fits — skills, time investment, taste alignment. Concrete.
  why_it_works          60-80 words. Why this niche has room right now. Reference the typical price range, modeled margin, or seasonality honestly.
  product_ideas         exactly 5 items. Specific product ideas tuned to the catalog's aesthetic_clusters and inventory_models. Short (5-12 words each).
  what_to_avoid         50-80 words. Honest watch-outs: common quality misses, policy risk if any flags are set, oversaturation traps.
  meta_title            50-60 chars. SEO title. Pattern: "<Niche Name> on Etsy: A Niche Guide" (vary phrasing across niches).
  meta_description      150-160 chars. SEO meta description. Hook + value prop + soft CTA.
  pin_tagline           4-7 words. Tagline for the Pinterest pin. Examples: "a low-competition Etsy niche" / "an evergreen seller" / "a Q4-heavy Etsy niche".
  share_description     1-2 sentences. Used as the description in Pinterest "Pin It" links. Plain. No emoji. No "skyrocket"/"crush"/"dominate".

Voice: confident but warm. Editorial, not hype. Short sentences. No "skyrocket", "crush", "dominate", "explode", "secret".

Output JSON only. Begin with { and end with }. No prose before or after.`;

function buildUserPrompt(niche: CatalogNiche): string {
  return `NICHE
  id: ${niche.id}
  name: ${niche.name}
  etsy_taxonomy: ${niche.etsy_taxonomy.join(" / ")}
  inventory_models: ${niche.inventory_models.join(", ")}
  required_skills: ${niche.required_skills.join(", ") || "none"}
  required_equipment: ${niche.required_equipment.join(", ") || "none"}
  aesthetic_clusters: ${niche.aesthetic_clusters.join(", ")}
  typical_price_range: $${niche.typical_price_range[0]}–${niche.typical_price_range[1]}
  modeled_net_margin_pct: ${(niche.modeled_net_margin_pct * 100).toFixed(0)}%
  seasonality_index_q4: ${niche.seasonality_index_q4}
  seasonality_year_round: ${niche.seasonality_year_round}
  policy_risk_flags: [${niche.policy_risk_flags.join(", ") || "none"}]
  default_search_query: ${niche.default_search_query}

Return the NicheContent JSON object for this niche.`;
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return text;
  return text.slice(start, end + 1);
}

async function generateOne(
  client: Anthropic,
  niche: CatalogNiche,
  attempt: number = 0
): Promise<NicheContent | null> {
  const temperature = attempt === 0 ? 0.5 : 0.3;
  let raw: string;
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(niche) }],
    });
    if (msg.stop_reason === "max_tokens") {
      console.warn(`  [${niche.id}] hit max_tokens — JSON likely truncated.`);
      if (attempt === 0) return generateOne(client, niche, 1);
      return null;
    }
    raw = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  } catch (err) {
    console.error(`  [${niche.id}] API error:`, err instanceof Error ? err.message : err);
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    if (attempt === 0) {
      console.warn(`  [${niche.id}] JSON parse failed, retrying at lower temp...`);
      return generateOne(client, niche, 1);
    }
    console.error(`  [${niche.id}] JSON parse failed twice, skipping.`);
    return null;
  }

  const validation = nicheContentSchema.safeParse(parsed);
  if (!validation.success) {
    if (attempt === 0) {
      console.warn(`  [${niche.id}] schema validation failed:`, validation.error.issues.map((i) => i.message).join("; "));
      console.warn(`  [${niche.id}] retrying at lower temp...`);
      return generateOne(client, niche, 1);
    }
    console.error(`  [${niche.id}] schema validation failed twice, skipping. Issues:`, validation.error.issues);
    return null;
  }

  return validation.data;
}

function serializeOutput(map: NicheContentMap): string {
  const header = `/* Generated by scripts/generate-niche-content.ts on ${new Date().toISOString()}.
   Hand-edits welcome — re-running the script will overwrite this file.
   Run:  npm run generate:niche-content */

import type { NicheContentMap } from "@/lib/types";

export const NICHE_CONTENT: NicheContentMap = ${JSON.stringify(map, null, 2)};
`;
  return header;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Add it to .env.local and re-run.");
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`Generating prose for ${NICHE_CATALOG.length} niches...`);
  const out: NicheContentMap = {};
  const skipped: string[] = [];

  for (const niche of NICHE_CATALOG) {
    process.stdout.write(`  ${niche.id} ... `);
    const content = await generateOne(client, niche);
    if (content) {
      out[niche.id] = content;
      console.log("ok");
    } else {
      skipped.push(niche.id);
      console.log("SKIPPED");
    }
  }

  writeFileSync(OUT_PATH, serializeOutput(out), "utf8");
  console.log(`\nWrote ${Object.keys(out).length}/${NICHE_CATALOG.length} entries to ${OUT_PATH}`);

  if (skipped.length > 0) {
    console.log(`\nSkipped (need manual fill in src/data/niche-content.ts):`);
    for (const id of skipped) console.log(`  - ${id}`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
