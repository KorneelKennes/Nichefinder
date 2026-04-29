# Social Media Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make NicheFinder's result niches shareable on social media — Pinterest-first — by generating per-niche public guide pages at `/n/<slug>` with editorial pin and OG images, and wiring Pinterest + copy-link buttons into the result cards.

**Architecture:** Catalog stays the source of truth; a one-time Claude batch generates a static prose-content map (`src/data/niche-content.ts`) committed to git. Niche pages are SSG'd via `generateStaticParams`. Pinterest pin (1000×1500) is a route handler returning `ImageResponse`; standard OG (1200×630) uses Next.js's `opengraph-image.tsx` file convention. A new `src/lib/share.ts` centralizes URL building and the existing `cfMeta()` helper (lifted from `NicheCards.tsx`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, `@anthropic-ai/sdk@^0.91.1` (Claude Sonnet 4.6), Zod 4, `next/og` for `ImageResponse`, `tsx` for running the one-off generation script.

**Spec:** [`docs/superpowers/specs/2026-04-29-social-media-sharing-design.md`](../specs/2026-04-29-social-media-sharing-design.md)

**Verification posture:** This project has no test framework and no automated test suite. Per the spec and the project's existing posture, every task ends with manual verification (`npm run typecheck`, `npm run dev` + browser check, hitting routes directly, inspecting generated files). Do not introduce a test framework as part of this work — that's separate scope.

---

## File-structure overview

**New files:**
```
scripts/
└── generate-niche-content.ts            # one-off Claude batch script
src/
├── app/
│   ├── n/
│   │   └── [slug]/
│   │       ├── page.tsx                  # niche guide page (SSG)
│   │       ├── opengraph-image.tsx       # 1200×630 OG (file convention)
│   │       ├── pinterest-image/
│   │       │   └── route.ts              # 1000×1500 Pinterest pin
│   │       ├── Fraunces-Italic.ttf       # font asset, fetched via import.meta.url
│   │       └── Inter-Medium.ttf          # font asset, fetched via import.meta.url
│   └── sitemap.ts                        # static URL sitemap
├── data/
│   └── niche-content.ts                  # output of generation script (committed)
└── lib/
    └── share.ts                          # buildShareUrls(), cfMeta(), copyToClipboard()
```

**Modified files:**
- `package.json` — add `tsx` and `dotenv` devDeps, add `generate:niche-content` script.
- `.env.example` — add `NEXT_PUBLIC_SITE_URL`.
- `src/lib/types.ts` — add `NicheContent` type and `NicheContentMap` type.
- `src/lib/schemas.ts` — add `nicheContentSchema` and `nicheContentMapSchema`.
- `src/components/NicheCards.tsx` — remove local `cfMeta()`, import from `lib/share.ts`; wire Pinterest + copy-link on `HeroNicheCard`; replace bookmark on `CompactNicheCard` with Pinterest action.
- `src/app/globals.css` — append niche-page section styles.

---

## Task 1 — Tooling setup (deps, npm script, env example)

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install `tsx` and `dotenv` as devDependencies**

Run:
```bash
npm install --save-dev tsx dotenv
```

Expected: both packages added to `package.json` under `devDependencies`. `tsx` is for running the TS generation script directly; `dotenv` is for the script to read `ANTHROPIC_API_KEY` from `.env.local`.

- [ ] **Step 2: Add the npm script**

Open `package.json`. Add to the `scripts` block, after `"typecheck"`:

```json
"generate:niche-content": "tsx scripts/generate-niche-content.ts"
```

The full `scripts` block becomes:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "typecheck": "tsc --noEmit",
  "generate:niche-content": "tsx scripts/generate-niche-content.ts"
}
```

- [ ] **Step 3: Add `NEXT_PUBLIC_SITE_URL` to `.env.example`**

Open `.env.example`. Append:

```dotenv

# Public site origin used when building absolute share URLs (Pinterest, copy-link).
# Without this set, share URLs fall back to the request origin in the browser
# and to http://localhost:3000 on the server.
NEXT_PUBLIC_SITE_URL=https://nichefinder.io
```

- [ ] **Step 4: Verify the script runner works**

Create a one-line probe to make sure `tsx` is wired:
```bash
echo "console.log('tsx ok');" > /tmp/tsx-probe.ts
npx tsx /tmp/tsx-probe.ts
```
Expected stdout: `tsx ok`. Then delete the probe.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add tsx + dotenv for content generation script

- npm script: generate:niche-content
- env: NEXT_PUBLIC_SITE_URL for absolute share URLs"
```

---

## Task 2 — Types and Zod schemas for `NicheContent`

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/schemas.ts`

- [ ] **Step 1: Add the `NicheContent` and `NicheContentMap` types**

Open `src/lib/types.ts`. Append at the end (after the existing `GenerateResponse` type):

```ts
/**
 * Static prose for each per-niche guide page. Generated once via
 * scripts/generate-niche-content.ts and committed to src/data/niche-content.ts.
 * Keys must cover every NICHE_CATALOG[i].id.
 */
export type NicheContent = {
  description: string;          // 80-100 words, page section "What this is"
  who_this_is_for: string;      // 80-100 words, page section "Who this is for"
  why_it_works: string;         // 60-80 words, page section "Why it works right now"
  product_ideas: string[];      // exactly 5 items, page section "What to start with"
  what_to_avoid: string;        // 50-80 words, page section "Watch-outs"
  meta_title: string;           // 50-60 chars, <title>
  meta_description: string;     // 150-160 chars, <meta description>
  pin_tagline: string;          // 4-7 words, used on the Pinterest pin
  share_description: string;    // 1-2 sentences, used in Pinterest "Pin It" URL description
};

export type NicheContentMap = Record<string, NicheContent>;
```

- [ ] **Step 2: Add the matching Zod schemas**

Open `src/lib/schemas.ts`. Append at the end:

```ts
// Static per-niche prose. Validated when generating src/data/niche-content.ts
// and (loosely) when read at build time, to catch hand-edits that drift.
export const nicheContentSchema = z.object({
  description: z.string().min(200).max(900),
  who_this_is_for: z.string().min(200).max(900),
  why_it_works: z.string().min(150).max(700),
  product_ideas: z.array(z.string().min(1).max(280)).length(5),
  what_to_avoid: z.string().min(120).max(700),
  meta_title: z.string().min(20).max(80),
  meta_description: z.string().min(80).max(200),
  pin_tagline: z.string().min(8).max(80),
  share_description: z.string().min(40).max(280),
});

export const nicheContentMapSchema = z.record(z.string(), nicheContentSchema);
```

(Word counts in the type comments are approximate, the byte/char limits in the Zod schema are the actual gates. 200 chars ≈ 30 words at the lower bound; 900 chars ≈ 150 words at the upper bound, comfortable for the spec's "80–100 words".)

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/schemas.ts
git commit -m "feat: add NicheContent type and Zod schema

Static prose shape for per-niche guide pages. Used by the generation
script and the /n/[slug] page."
```

---

## Task 3 — Share helper module (`src/lib/share.ts`)

**Files:**
- Create: `src/lib/share.ts`

This task creates the helper without yet touching `NicheCards.tsx`. The next task does the refactor in isolation, so this commit is purely additive and safe.

- [ ] **Step 1: Write `src/lib/share.ts`**

```ts
/**
 * Shared social-link + Creative Fabrica helpers used by the result cards
 * and the per-niche guide pages. Lifted from NicheCards.tsx so both
 * surfaces share one source of truth.
 */

import type { CatalogNiche, InventoryModel, ResultNiche } from "@/lib/types";

const FALLBACK_ORIGIN = "http://localhost:3000";

function siteOrigin(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_ORIGIN;
}

export function nichePageUrl(slug: string): string {
  return `${siteOrigin()}/n/${slug}`;
}

export function pinterestImageUrl(slug: string): string {
  return `${siteOrigin()}/n/${slug}/pinterest-image`;
}

/**
 * Pinterest's official "Pin It" endpoint. Pre-fills the pin creation
 * dialog with our page URL, our pin image URL, and a description.
 * Docs: https://developers.pinterest.com/docs/web-features/save/
 */
export function pinterestShareUrl(args: {
  slug: string;
  description: string;
}): string {
  const params = new URLSearchParams({
    url: nichePageUrl(args.slug),
    media: pinterestImageUrl(args.slug),
    description: args.description,
  });
  return `https://pinterest.com/pin/create/button/?${params.toString()}`;
}

export function buildShareUrls(args: {
  slug: string;
  shareDescription: string;
}): {
  pageUrl: string;
  pinterestUrl: string;
} {
  return {
    pageUrl: nichePageUrl(args.slug),
    pinterestUrl: pinterestShareUrl({
      slug: args.slug,
      description: args.shareDescription,
    }),
  };
}

/**
 * Copy a string to the clipboard. Returns true on success, false if the
 * Clipboard API is unavailable or denied.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creative Fabrica search button label + URL for a niche. The label is
 * conditional on inventory model so it reads honestly:
 *   - pod          → "Find graphics for your designs"
 *   - made / stock → "Find fonts & mockups for your shop"
 *   - digital / unsure / unknown → "Find templates to remix"
 *
 * Accepts either a ResultNiche (single inventory_model) or a CatalogNiche
 * (inventory_models array). When both are set, inventory_model wins;
 * when only the array is set, the first entry is used; when neither
 * is set, falls back to the digital/unsure label.
 */
export function cfMeta(
  niche:
    | Pick<ResultNiche, "name" | "cf_query" | "inventory_model">
    | Pick<CatalogNiche, "name" | "cf_query" | "inventory_models">
    | { name: string; cf_query: string; inventory_model?: InventoryModel; inventory_models?: InventoryModel[] }
): { url: string; label: string; sub: string } {
  const inv = pickInventoryModel(niche);
  const query = niche.cf_query || niche.name;
  let label: string;
  switch (inv) {
    case "pod":
      label = "Find graphics for your designs";
      break;
    case "made":
    case "stock":
      label = "Find fonts & mockups for your shop";
      break;
    case "digital":
    case "unsure":
    default:
      label = "Find templates to remix";
      break;
  }
  return {
    url: `https://www.creativefabrica.com/search/?query=${encodeURIComponent(query)}`,
    label,
    sub: "Creative Fabrica",
  };
}

function pickInventoryModel(niche: {
  inventory_model?: InventoryModel;
  inventory_models?: InventoryModel[];
}): InventoryModel | undefined {
  if (niche.inventory_model) return niche.inventory_model;
  if (niche.inventory_models && niche.inventory_models.length > 0) return niche.inventory_models[0];
  return undefined;
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/share.ts
git commit -m "feat: add lib/share.ts with cfMeta + share URL builders

Centralizes Pinterest 'Pin It' URL construction, page-URL resolution,
clipboard helper, and Creative Fabrica button metadata. Used by the
result cards and the per-niche guide pages."
```

---

## Task 4 — Refactor `NicheCards.tsx` to import `cfMeta` from the new module

**Files:**
- Modify: `src/components/NicheCards.tsx`

This task is a pure refactor — no behavior change. We move `cfMeta` from local to imported. Splitting it from the share-button wiring (Task 11) lets the diff stay reviewable.

- [ ] **Step 1: Add the import**

In `src/components/NicheCards.tsx`, after the existing imports (around line 7), add:

```ts
import { cfMeta as sharedCfMeta } from "@/lib/share";
```

(Imported under an alias to make the next step's deletion easy to spot.)

- [ ] **Step 2: Delete the local `cfMeta` function and use the import**

Search the file for the comment block that begins with `// Creative Fabrica search:` (currently around line 58). Delete from that comment block down through the closing `}` of the `function cfMeta(...) { ... }` definition that follows it (about 28 lines, ending where the `function HeroNicheCard(...)` declaration begins).

Then update the alias import you added in Step 1 to drop the alias:

```ts
import { cfMeta } from "@/lib/share";
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```
Expected: no errors. The `HeroNicheCard` uses `cfMeta(n)` which now resolves to the imported function.

- [ ] **Step 4: Run dev server and smoke-test the result page**

```bash
npm run dev
```
Open http://localhost:3000, take the quiz, land on `/results`, confirm the Creative Fabrica button on the hero card still shows the right label and links to the right Creative Fabrica search URL. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/NicheCards.tsx
git commit -m "refactor: import cfMeta from lib/share

No behavior change. Single source of truth ahead of adding the per-niche
guide pages, which use the same helper."
```

---

## Task 5 — Generation script (`scripts/generate-niche-content.ts`)

**Files:**
- Create: `scripts/generate-niche-content.ts`

This task only writes the script. The next task runs it.

- [ ] **Step 1: Create the script**

Create `scripts/generate-niche-content.ts`:

```ts
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

import "dotenv/config";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { NICHE_CATALOG } from "../src/data/catalog";
import { nicheContentSchema } from "../src/lib/schemas";
import type { CatalogNiche, NicheContent, NicheContentMap } from "../src/lib/types";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1500;
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
```

- [ ] **Step 2: Sanity-check the script compiles standalone**

```bash
npx tsx --tsconfig tsconfig.json scripts/generate-niche-content.ts --help 2>&1 | head -5 || true
```
This may print an API-key error from `main()`, which is fine — we just want zero TypeScript compile errors. If you see *"ANTHROPIC_API_KEY is not set"*, that means the script ran past compile. Pass.

If you see TypeScript errors about path aliases (`@/lib/...`), the script uses **relative imports** (`../src/lib/...`) on purpose to avoid alias-resolution issues with `tsx`. Confirm the imports at the top of the file are relative.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-niche-content.ts
git commit -m "feat: add scripts/generate-niche-content.ts

One-shot Claude Sonnet 4.6 batch that generates NicheContent prose for
every catalog entry. Validates each result against the Zod schema, retries
once on failure at lower temperature, writes a TypeScript literal to
src/data/niche-content.ts. Run via: npm run generate:niche-content"
```

---

## Task 6 — Run the generation script and commit `niche-content.ts`

**Files:**
- Create (by running script): `src/data/niche-content.ts`

- [ ] **Step 1: Make sure `ANTHROPIC_API_KEY` is in `.env.local`**

Check:
```bash
grep -q "^ANTHROPIC_API_KEY=" .env.local && echo "set" || echo "missing"
```
Expected: `set`. If `missing`, add the key to `.env.local` (do not commit it).

- [ ] **Step 2: Run the generator**

```bash
npm run generate:niche-content
```

Expected: 25 lines of `<niche-id> ... ok`, ending with `Wrote 25/25 entries to ...`. If any niche is `SKIPPED`, the script exits with code 2 and lists them — fill those entries in by hand directly in `src/data/niche-content.ts` before continuing.

- [ ] **Step 3: Read every generated entry**

Open `src/data/niche-content.ts`. Skim each entry. The voice rules ("no 'skyrocket', 'crush', 'dominate'", editorial register) are in the prompt but Claude can still slip — hand-edit anything that reads off-brand. Pay special attention to `pin_tagline` (it's the 4–7 words that show up large on every Pinterest pin) and `meta_title` / `meta_description` (these go to Google).

- [ ] **Step 4: Run typecheck against the new file**

```bash
npm run typecheck
```
Expected: no errors. If there are errors about missing fields, re-run the generator or hand-fill the missing fields.

- [ ] **Step 5: Commit**

```bash
git add src/data/niche-content.ts
git commit -m "feat: generate NicheContent prose for all 25 catalog niches

Output of: npm run generate:niche-content
Hand-edited where Claude's voice slipped or the pin_tagline read flat."
```

---

## Task 7 — Per-niche guide page (`/n/[slug]`)

**Files:**
- Create: `src/app/n/[slug]/page.tsx`
- Modify: `src/app/globals.css` (append niche-page section styles)

- [ ] **Step 1: Write the page**

Create `src/app/n/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav, Footer } from "@/components/Nav";
import { Display } from "@/components/primitives";
import { NICHE_CATALOG } from "@/data/catalog";
import { NICHE_CONTENT } from "@/data/niche-content";
import { cfMeta, nichePageUrl } from "@/lib/share";
import type { CatalogNiche } from "@/lib/types";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return NICHE_CATALOG.map((n) => ({ slug: n.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const niche = NICHE_CATALOG.find((n) => n.id === slug);
  const content = NICHE_CONTENT[slug];
  if (!niche || !content) return {};

  const url = nichePageUrl(slug);
  return {
    title: content.meta_title,
    description: content.meta_description,
    alternates: { canonical: url },
    openGraph: {
      title: content.meta_title,
      description: content.meta_description,
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: content.meta_title,
      description: content.meta_description,
    },
  };
}

function seasonalityVerdict(n: CatalogNiche): string {
  if (n.seasonality_index_q4 >= 0.95 && n.seasonality_year_round >= 0.7) return "evergreen with a Q4 lift";
  if (n.seasonality_index_q4 >= 0.95) return "Q4-heavy";
  if (n.seasonality_year_round >= 0.85) return "evergreen";
  return "seasonal";
}

function inventoryLabel(n: CatalogNiche): string {
  const m = n.inventory_models[0];
  switch (m) {
    case "digital":
      return "Digital downloads";
    case "pod":
      return "Print-on-demand";
    case "made":
      return "Made-to-order";
    case "stock":
      return "Physical inventory";
    case "unsure":
    default:
      return "Mixed";
  }
}

function relatedNiches(current: CatalogNiche): CatalogNiche[] {
  const overlap = (a: CatalogNiche, b: CatalogNiche) =>
    a.aesthetic_clusters.filter((c) => b.aesthetic_clusters.includes(c)).length;
  return NICHE_CATALOG
    .filter((n) => n.id !== current.id)
    .map((n) => ({ n, score: overlap(current, n) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.n);
}

export default async function NichePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const niche = NICHE_CATALOG.find((n) => n.id === slug);
  const content = NICHE_CONTENT[slug];
  if (!niche || !content) notFound();

  const cf = cfMeta(niche);
  const verdict = seasonalityVerdict(niche);
  const inv = inventoryLabel(niche);
  const related = relatedNiches(niche);
  const priceRange = `$${niche.typical_price_range[0]}–${niche.typical_price_range[1]}`;
  const marginPct = `${Math.round(niche.modeled_net_margin_pct * 100)}%`;

  return (
    <>
      <Nav />

      {/* 1. Hero */}
      <section className="niche-page-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={niche.hero_img} alt="" className="niche-page-hero-img" />
        <div className="niche-page-hero-overlay" />
        <div className="container niche-page-hero-content">
          <div className="muted niche-page-breadcrumb tabular">
            {niche.etsy_taxonomy.join(" / ")}
          </div>
          <h1 className="display niche-page-title">
            <em>{niche.name}</em>
          </h1>
          <div className="niche-page-microstats">
            <div><span className="label">PRICE</span><span className="tabular">{priceRange}</span></div>
            <div><span className="label">MARGIN</span><span className="tabular">~{marginPct}</span></div>
            <div><span className="label">SHAPE</span><span>{verdict}</span></div>
          </div>
        </div>
      </section>

      <section className="container niche-page-prose">
        {/* 2. What this is */}
        <div className="niche-page-section">
          <div className="label">WHAT THIS IS</div>
          <p>{content.description}</p>
        </div>

        {/* 3. Who this is for */}
        <div className="niche-page-section">
          <div className="label">WHO THIS IS FOR</div>
          <p>{content.who_this_is_for}</p>
        </div>

        {/* 4. Why it works right now */}
        <div className="niche-page-section">
          <div className="label">WHY IT WORKS RIGHT NOW</div>
          <p>{content.why_it_works}</p>
        </div>

        {/* 5. What to start with + Creative Fabrica CTA */}
        <div className="niche-page-section">
          <div className="label">WHAT TO START WITH</div>
          <p className="muted niche-page-search-cue">
            Buyers search for things like <em>&ldquo;{niche.default_search_query}&rdquo;</em>.
          </p>
          <ol className="ideas-list niche-page-ideas">
            {content.product_ideas.map((p, i) => (
              <li key={i}>
                <span className="tabular" style={{ color: "var(--brass)", fontWeight: 500, marginRight: 12 }}>
                  0{i + 1}
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
          <a className="btn btn-secondary niche-page-cf-cta" href={cf.url} target="_blank" rel="noopener noreferrer">
            {cf.label} <span style={{ fontSize: 16 }}>→</span>
          </a>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{cf.sub}</div>
        </div>

        {/* 6. Watch-outs */}
        <div className="niche-page-section">
          <div className="label">WATCH-OUTS</div>
          <p>{content.what_to_avoid}</p>
          {niche.policy_risk_flags.length > 0 && (
            <div className="error-banner" style={{ marginTop: 14 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 10 }} />
              Etsy policy flags: {niche.policy_risk_flags.join(", ")}
            </div>
          )}
        </div>

        {/* 7. The numbers */}
        <div className="niche-page-section">
          <div className="label">THE NUMBERS</div>
          <div className="niche-page-numbers">
            <div>
              <div className="label" style={{ fontSize: 11 }}>TYPICAL PRICE</div>
              <div className="tabular" style={{ fontSize: 22, marginTop: 4 }}>{priceRange}</div>
            </div>
            <div>
              <div className="label" style={{ fontSize: 11 }}>MODELED MARGIN</div>
              <div className="tabular" style={{ fontSize: 22, marginTop: 4 }}>~{marginPct}</div>
            </div>
            <div>
              <div className="label" style={{ fontSize: 11 }}>Q4 INDEX</div>
              <div className="tabular" style={{ fontSize: 22, marginTop: 4 }}>{niche.seasonality_index_q4.toFixed(2)}</div>
            </div>
            <div>
              <div className="label" style={{ fontSize: 11 }}>YEAR-ROUND</div>
              <div className="tabular" style={{ fontSize: 22, marginTop: 4 }}>{niche.seasonality_year_round.toFixed(2)}</div>
            </div>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 12, fontStyle: "italic" }}>
            Margin and seasonality are <em>modeled</em> from category averages. Inventory model: {inv}.
          </div>
        </div>
      </section>

      {/* 8. Find-your-match CTA */}
      <section className="container niche-page-cta">
        <Display
          parts={["Is this a fit for ", { em: "your" }, " time, budget, and aesthetic?"]}
          style={{ fontSize: "clamp(28px, 4vw, 44px)" }}
        />
        <p className="muted" style={{ maxWidth: 540, margin: "16px auto 28px", fontSize: 16 }}>
          Take the 60-second quiz and see whether {niche.name.toLowerCase()} matches your
          skills, hours, and starting budget — alongside two other niches scored on real Etsy data.
        </p>
        <Link className="btn btn-primary" href="/quiz/1">
          Take the 60-second quiz →
        </Link>
      </section>

      {/* 9. Related niches */}
      {related.length > 0 && (
        <section className="container niche-page-related">
          <div className="label" style={{ marginBottom: 16 }}>RELATED NICHES</div>
          <div className="niche-page-related-grid">
            {related.map((r) => (
              <Link key={r.id} href={`/n/${r.id}`} className="niche-page-related-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.hero_img} alt="" />
                <div className="niche-page-related-body">
                  <div className="muted tabular" style={{ fontSize: 11 }}>
                    {r.etsy_taxonomy[0]}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 6 }}>
                    {r.name}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Append the niche-page CSS to `globals.css`**

Open `src/app/globals.css`. Append at the end of the file:

```css
/* === Niche guide page (/n/[slug]) === */

.niche-page-hero {
  position: relative;
  height: clamp(360px, 48vw, 520px);
  overflow: hidden;
}
.niche-page-hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.niche-page-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%);
}
.niche-page-hero-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: clamp(28px, 4vw, 56px);
  color: #F7F2E8;
}
.niche-page-breadcrumb {
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(247, 242, 232, 0.85);
  margin-bottom: 14px;
}
.niche-page-title {
  font-size: clamp(40px, 6vw, 72px);
  margin: 0;
  color: #F7F2E8;
}
.niche-page-microstats {
  display: flex;
  gap: clamp(20px, 3vw, 40px);
  margin-top: 22px;
  flex-wrap: wrap;
  align-items: baseline;
}
.niche-page-microstats > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.niche-page-microstats .label {
  color: rgba(247, 242, 232, 0.7);
  font-size: 11px;
  letter-spacing: 0.18em;
}
.niche-page-microstats .tabular,
.niche-page-microstats span:not(.label) {
  font-size: 16px;
  color: #F7F2E8;
}

.niche-page-prose {
  max-width: 720px;
  padding-top: clamp(40px, 5vw, 72px);
  padding-bottom: clamp(20px, 3vw, 40px);
}
.niche-page-section {
  margin-bottom: clamp(36px, 5vw, 56px);
}
.niche-page-section p {
  font-size: 17px;
  line-height: 1.7;
  margin: 12px 0 0;
  color: var(--ink);
}
.niche-page-section .label {
  margin-bottom: 4px;
}
.niche-page-search-cue {
  font-size: 14.5px !important;
  color: var(--ink-muted) !important;
  margin-bottom: 18px !important;
}
.niche-page-ideas {
  margin: 0 0 22px;
}
.niche-page-cf-cta {
  margin-top: 6px;
}
.niche-page-numbers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 24px;
  margin-top: 14px;
  padding: 22px 0;
  border-top: 1px solid var(--hairline);
  border-bottom: 1px solid var(--hairline);
}
.niche-page-cta {
  text-align: center;
  padding-top: clamp(48px, 6vw, 80px);
  padding-bottom: clamp(48px, 6vw, 80px);
  background: var(--bg-2);
  border-top: 1px solid var(--hairline);
  border-bottom: 1px solid var(--hairline);
}
.niche-page-related {
  padding-top: clamp(40px, 5vw, 72px);
  padding-bottom: clamp(40px, 5vw, 72px);
}
.niche-page-related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}
.niche-page-related-card {
  display: block;
  background: var(--bg-2);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: var(--ink);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.niche-page-related-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.06);
}
.niche-page-related-card img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  display: block;
}
.niche-page-related-body {
  padding: 14px 16px 18px;
}
```

(All CSS variables used here — `--bg-2`, `--ink`, `--ink-muted`, `--hairline`, `--brass` — are defined in the existing `:root` block at the top of `globals.css`.)

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Run dev server and verify the page renders**

```bash
npm run dev
```
Open `http://localhost:3000/n/boho-wedding-stationery`. Expected:
- Hero with the catalog photo, niche name in italic Fraunces, three micro-stats overlay.
- Six prose sections including all 5 product ideas + the Creative Fabrica CTA button.
- The big "Take the 60-second quiz" CTA section.
- Three related niche cards, each linking to `/n/<other-slug>`.
- Standard Nav and Footer.

Try one or two more slugs (`/n/minimalist-printable-wall-art`, `/n/botanical-line-art`) to confirm everything renders. Confirm `/n/does-not-exist` returns the 404 page.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/app/n src/app/globals.css
git commit -m "feat: per-niche guide page at /n/[slug]

SSG via generateStaticParams from NICHE_CATALOG. Pulls prose from
NICHE_CONTENT and structured data from the catalog. Sections: hero,
what-this-is, who-this-is-for, why-it-works, what-to-start-with (with
Creative Fabrica CTA), watch-outs, the-numbers, find-your-match CTA,
related niches. notFound() for slugs absent from the catalog."
```

---

## Task 8 — Add font assets for the image routes

**Files:**
- Create: `src/app/n/[slug]/Fraunces-Italic.ttf`
- Create: `src/app/n/[slug]/Inter-Medium.ttf`

`ImageResponse` (via Satori) needs static-weight TTF/OTF files — variable fonts don't work. We colocate the two we need next to the image routes.

- [ ] **Step 1: Download Fraunces 72pt MediumItalic**

Fraunces is OFL-licensed. Static instances live in the upstream repo at `fonts/static/`. Download the 72pt MediumItalic (display-size, optimized for the 88px name on the pin):

```bash
curl -L -o "src/app/n/[slug]/Fraunces-Italic.ttf" \
  "https://github.com/undercaseType/Fraunces/raw/main/fonts/static/Fraunces_72pt-MediumItalic.ttf"
```

Verify it's a real font file (not an HTML 404):
```bash
file "src/app/n/[slug]/Fraunces-Italic.ttf"
```
Expected output contains: `TrueType Font data`. If it says `HTML document` or similar, the upstream URL has changed — find the equivalent file under `https://github.com/undercaseType/Fraunces/tree/main/fonts/static` and re-download.

- [ ] **Step 2: Download Inter Medium**

Inter is OFL-licensed. Static-weight files live at `Inter Desktop/`:

```bash
curl -L -o "src/app/n/[slug]/Inter-Medium.ttf" \
  "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Medium.ttf"
```

Verify:
```bash
file "src/app/n/[slug]/Inter-Medium.ttf"
```
Expected: `TrueType Font data`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/n/[slug]/Fraunces-Italic.ttf" "src/app/n/[slug]/Inter-Medium.ttf"
git commit -m "chore: add Fraunces + Inter TTFs for image-route rendering

Static-weight fonts colocated with the image routes so they can be
fetched via import.meta.url at edge runtime. Both OFL-licensed."
```

---

## Task 9 — Standard OG image route (`opengraph-image.tsx`)

**Files:**
- Create: `src/app/n/[slug]/opengraph-image.tsx`

This uses Next.js's file convention — Next auto-wires the `og:image` meta tag for `/n/<slug>` to the URL of this generated image. (Our `generateMetadata` from Task 7 only sets descriptive metadata; the file convention provides the image URL automatically.)

- [ ] **Step 1: Write the OG image route**

Create `src/app/n/[slug]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { NICHE_CATALOG } from "@/data/catalog";
import { NICHE_CONTENT } from "@/data/niche-content";

export const runtime = "edge";
export const alt = "NicheFinder — niche guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Match the design tokens in src/app/globals.css :root.
const CREAM = "#F7F2E8";   // --bg
const INK = "#2A201A";     // --ink
const BRASS = "#B8893A";   // --brass
const MUTED = "#6B6660";   // --ink-muted

export default async function OG({ params }: { params: { slug: string } }) {
  const niche = NICHE_CATALOG.find((n) => n.id === params.slug);
  const content = NICHE_CONTENT[params.slug];
  if (!niche || !content) {
    return new Response("Not found", { status: 404 });
  }

  const fraunces = await fetch(new URL("./Fraunces-Italic.ttf", import.meta.url)).then((r) => r.arrayBuffer());
  const inter = await fetch(new URL("./Inter-Medium.ttf", import.meta.url)).then((r) => r.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: CREAM,
        }}
      >
        {/* Left half — hero photo */}
        <div style={{ width: 600, height: 630, display: "flex", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={niche.hero_img}
            alt=""
            width={600}
            height={630}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Right half — text */}
        <div
          style={{
            width: 600,
            height: 630,
            padding: "56px 56px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            color: INK,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: "Inter",
                fontSize: 16,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: 18,
              }}
            >
              {niche.etsy_taxonomy[0]}
            </div>
            <div
              style={{
                fontFamily: "Fraunces",
                fontStyle: "italic",
                fontSize: 64,
                lineHeight: 1.05,
                color: INK,
                letterSpacing: "-0.01em",
              }}
            >
              {niche.name}
            </div>
            <div
              style={{
                fontFamily: "Inter",
                fontSize: 22,
                lineHeight: 1.4,
                color: MUTED,
                marginTop: 22,
              }}
            >
              {content.pin_tagline}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                fontFamily: "Fraunces",
                fontStyle: "italic",
                fontSize: 26,
                color: BRASS,
              }}
            >
              nichefinder
            </div>
            <div
              style={{
                fontFamily: "Inter",
                fontSize: 14,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: MUTED,
              }}
            >
              See what sells before you make it
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, style: "italic", weight: 500 },
        { name: "Inter", data: inter, style: "normal", weight: 500 },
      ],
    }
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Verify the image renders**

```bash
npm run dev
```
Open `http://localhost:3000/n/boho-wedding-stationery/opengraph-image`. Expected: a 1200×630 PNG with the hero photo on the left, niche name + tagline + wordmark on the right. Check the image via curl as well:

```bash
curl -sI http://localhost:3000/n/boho-wedding-stationery/opengraph-image | head -5
```
Expected: `Content-Type: image/png` and a 200 status.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add "src/app/n/[slug]/opengraph-image.tsx"
git commit -m "feat: standard 1200x630 OG image for /n/[slug]

Edge ImageResponse via the Next.js opengraph-image file convention.
Auto-wires og:image and twitter:image. Hero photo left, niche name +
pin tagline + nichefinder wordmark right."
```

---

## Task 10 — Pinterest pin route (`pinterest-image/route.ts`)

**Files:**
- Create: `src/app/n/[slug]/pinterest-image/route.ts`

`pinterest-image` is not a Next.js file convention, so we use a route handler. The URL becomes `/n/<slug>/pinterest-image`, fetched by Pinterest as the `media` parameter of the "Pin It" URL.

- [ ] **Step 1: Write the route**

Create `src/app/n/[slug]/pinterest-image/route.ts`:

```ts
import { ImageResponse } from "next/og";
import { NICHE_CATALOG } from "@/data/catalog";
import { NICHE_CONTENT } from "@/data/niche-content";

export const runtime = "edge";

// Match the design tokens in src/app/globals.css :root.
const CREAM = "#F7F2E8";   // --bg
const INK = "#2A201A";     // --ink
const BRASS = "#B8893A";   // --brass
const MUTED = "#6B6660";   // --ink-muted

const SIZE = { width: 1000, height: 1500 } as const;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const niche = NICHE_CATALOG.find((n) => n.id === slug);
  const content = NICHE_CONTENT[slug];
  if (!niche || !content) {
    return new Response("Not found", { status: 404 });
  }

  // Font files live one directory up (sibling to the route directory).
  const fraunces = await fetch(new URL("../Fraunces-Italic.ttf", import.meta.url)).then((r) => r.arrayBuffer());
  const inter = await fetch(new URL("../Inter-Medium.ttf", import.meta.url)).then((r) => r.arrayBuffer());

  const inventoryShort =
    niche.inventory_models[0] === "digital" ? "Digital" :
    niche.inventory_models[0] === "pod" ? "Print-on-demand" :
    niche.inventory_models[0] === "made" ? "Made-to-order" :
    niche.inventory_models[0] === "stock" ? "Physical" :
    "Mixed";
  const priceLine = `$${niche.typical_price_range[0]}–${niche.typical_price_range[1]} typical`;
  const marginLine = `~${Math.round(niche.modeled_net_margin_pct * 100)}% margin`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: CREAM }}>
        {/* Top ~60% — hero photo with bottom gradient */}
        <div style={{ width: 1000, height: 900, position: "relative", display: "flex", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={niche.hero_img}
            alt=""
            width={1000}
            height={900}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 240,
              background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)",
              display: "flex",
            }}
          />
        </div>

        {/* Middle band — niche name + tagline + stats */}
        <div
          style={{
            width: 1000,
            height: 450,
            padding: "48px 64px 32px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: CREAM,
          }}
        >
          <div
            style={{
              fontFamily: "Fraunces",
              fontStyle: "italic",
              fontSize: 88,
              lineHeight: 1.02,
              letterSpacing: "-0.01em",
              color: INK,
            }}
          >
            {niche.name}
          </div>
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 28,
              lineHeight: 1.35,
              color: MUTED,
              marginTop: 24,
            }}
          >
            {content.pin_tagline}
          </div>
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 24,
              color: INK,
              marginTop: 32,
              display: "flex",
              gap: 22,
              flexWrap: "wrap",
            }}
          >
            <span>{inventoryShort}</span>
            <span style={{ color: MUTED }}>·</span>
            <span>{priceLine}</span>
            <span style={{ color: MUTED }}>·</span>
            <span>{marginLine}</span>
          </div>
        </div>

        {/* Bottom band — wordmark + URL */}
        <div
          style={{
            width: 1000,
            height: 150,
            padding: "0 64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${BRASS}`,
            background: CREAM,
          }}
        >
          <div style={{ fontFamily: "Fraunces", fontStyle: "italic", fontSize: 36, color: BRASS }}>
            nichefinder
          </div>
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 18,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            nichefinder.io
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "Fraunces", data: fraunces, style: "italic", weight: 500 },
        { name: "Inter", data: inter, style: "normal", weight: 500 },
      ],
    }
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Verify the pin renders**

```bash
npm run dev
```
Open `http://localhost:3000/n/boho-wedding-stationery/pinterest-image`. Expected: a 1000×1500 vertical PNG, hero photo top, niche name in Fraunces italic large below, tagline + 3 stats, wordmark + URL bottom.

Try one more slug to confirm it's not coupled to a single catalog entry.

```bash
curl -sI http://localhost:3000/n/boho-wedding-stationery/pinterest-image | head -3
```
Expected: 200 status, `image/png`.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add "src/app/n/[slug]/pinterest-image"
git commit -m "feat: 1000x1500 Pinterest pin route for /n/[slug]

Edge ImageResponse route handler. Hero photo top 60%, cream middle band
with niche name (Fraunces italic 88px) + pin tagline + 3-stat row,
brass-hairlined wordmark bottom. Used by the Pinterest 'Pin It' URL's
media parameter."
```

---

## Task 11 — Wire Pinterest + copy-link share buttons on the result cards

**Files:**
- Modify: `src/components/NicheCards.tsx`

- [ ] **Step 1: Add the new imports**

In `src/components/NicheCards.tsx`, replace the existing share helper import line (added in Task 4):

```ts
import { cfMeta } from "@/lib/share";
```

with:

```ts
import { cfMeta, buildShareUrls, copyToClipboard } from "@/lib/share";
import { useState } from "react";
```

(`useState` is already imported at the top of the file from Task 4 — verify; if it is, do not duplicate the import. If `useState` is already imported via the existing `import { useState } from "react";` line, just add the share helpers to the existing `lib/share` import.)

- [ ] **Step 2: Replace `HeroNicheCard`'s share-button row**

Find the existing block in `HeroNicheCard` (roughly lines 283–299 of the current file, after Task 4's renumbering may have shifted them — search for `niche-hero-actions`):

```tsx
<div className="niche-hero-actions">
  <a className="btn btn-primary" href={cf.url} target="_blank" rel="noopener noreferrer">
    {cf.label} <span style={{ fontSize: 16 }}>→</span>
  </a>
  <button className="btn btn-secondary">
    <i className="fa-regular fa-bookmark" style={{ fontSize: 14 }} /> Save niche
  </button>
  <button className="btn btn-ghost" style={{ marginLeft: "auto" }}>
    <i className="fa-brands fa-pinterest-p" style={{ fontSize: 14 }} />
  </button>
  <button className="btn btn-ghost">
    <i className="fa-brands fa-twitter" style={{ fontSize: 14 }} />
  </button>
  <button className="btn btn-ghost">
    <i className="fa-solid fa-link" style={{ fontSize: 13 }} />
  </button>
</div>
```

Replace with a new component-internal hook block + the wired row. Add this state hook near the top of the `HeroNicheCard` function body (right after `const subOrder = ...; const cf = cfMeta(n);`):

```tsx
const [copied, setCopied] = useState(false);
const share = buildShareUrls({ slug: n.id, shareDescription: `${n.name}: a niche on nichefinder.` });

const onCopy = async () => {
  const ok = await copyToClipboard(share.pageUrl);
  if (ok) {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
};
```

Then change the actions block to:

```tsx
<div className="niche-hero-actions">
  <a className="btn btn-primary" href={cf.url} target="_blank" rel="noopener noreferrer">
    {cf.label} <span style={{ fontSize: 16 }}>→</span>
  </a>
  <button className="btn btn-secondary">
    <i className="fa-regular fa-bookmark" style={{ fontSize: 14 }} /> Save niche
  </button>
  <a
    className="btn btn-ghost"
    style={{ marginLeft: "auto" }}
    href={share.pinterestUrl}
    target="_blank"
    rel="noopener noreferrer"
    title="Save to Pinterest"
    aria-label="Save to Pinterest"
  >
    <i className="fa-brands fa-pinterest-p" style={{ fontSize: 14 }} />
  </a>
  <button
    className="btn btn-ghost"
    onClick={onCopy}
    title={copied ? "Copied!" : "Copy link"}
    aria-label="Copy link to this niche"
  >
    <i
      className={copied ? "fa-solid fa-check" : "fa-solid fa-link"}
      style={{ fontSize: 13 }}
    />
  </button>
</div>
```

(The Twitter button is gone. Pinterest is now an `<a>` to the official "Pin It" endpoint. Copy-link button toggles to a check for 2 seconds.)

- [ ] **Step 3: Replace `CompactNicheCard`'s bookmark button with a Pinterest action**

Find the `CompactNicheCard` action row (search for the bookmark button inside the `niche-compact` markup, near the bottom):

```tsx
<button className="btn btn-ghost">
  <i className="fa-regular fa-bookmark" />
</button>
```

Add the share helper at the top of `CompactNicheCard`'s function body (after the existing `const meta = SCORE_LABELS[k];` etc — add it before the `return`):

```tsx
const share = buildShareUrls({ slug: n.id, shareDescription: `${n.name}: a niche on nichefinder.` });
```

Then replace the bookmark button with:

```tsx
<a
  className="btn btn-ghost"
  href={share.pinterestUrl}
  target="_blank"
  rel="noopener noreferrer"
  title="Save to Pinterest"
  aria-label="Save to Pinterest"
>
  <i className="fa-brands fa-pinterest-p" />
</a>
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 5: Smoke-test in the browser**

```bash
npm run dev
```

1. Take the quiz, land on `/results`.
2. On the hero card: click the Pinterest icon → a new tab opens to `pinterest.com/pin/create/button/?url=...&media=...&description=...` with the niche page URL and pin image URL pre-filled.
3. On the hero card: click the link icon → it briefly turns into a check, and pasting from the clipboard yields the niche page URL (`http://localhost:3000/n/<slug>` in dev, or the `NEXT_PUBLIC_SITE_URL` value if set).
4. On the compact cards (ranks 02 + 03): the right-side icon is now Pinterest, clicking it opens the same Pinterest dialog for *that* niche.
5. Confirm the Twitter icon is gone from the hero card row.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/NicheCards.tsx
git commit -m "feat: wire Pinterest + copy-link share buttons on result cards

HeroNicheCard: Pinterest button now opens the Pin It dialog with our
page + pin image URLs; copy-link button copies the absolute /n/<slug>
URL with a 2-second checkmark ack; Twitter placeholder removed.
CompactNicheCard: bookmark button replaced with Pinterest 'save'.
All wiring goes through lib/share.ts."
```

---

## Task 12 — Sitemap

**Files:**
- Create: `src/app/sitemap.ts`

The project doesn't currently have a sitemap. Adding one as part of this work is small and lets Google find the 25 new niche pages.

- [ ] **Step 1: Write the sitemap**

Create `src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { NICHE_CATALOG } from "@/data/catalog";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nichefinder.io";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "monthly", priority: 1.0 },
    { url: `${SITE}/methodology`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/beginners`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const nicheRoutes: MetadataRoute.Sitemap = NICHE_CATALOG.map((n) => ({
    url: `${SITE}/n/${n.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...nicheRoutes];
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Verify the sitemap renders**

```bash
npm run dev
```
Open `http://localhost:3000/sitemap.xml`. Expected: an XML sitemap listing the home page, /methodology, /beginners, and 25 `/n/<slug>` URLs.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat: add sitemap covering home, static routes, and 25 niche guides

Powers Google's discovery of the new /n/[slug] pages."
```

---

## Task 13 — End-to-end smoke test on a deployed preview

This task is verification-only — no code changes. It catches issues that only surface in the production build (edge fonts, OG unfurling, Pinterest's image fetch).

- [ ] **Step 1: Build locally and confirm static generation**

```bash
npm run build
```
Expected output includes:
- A `Generating static pages` summary that lists the 25 `/n/<slug>` paths as static (`●` or equivalent marker).
- No errors.

- [ ] **Step 2: Push the branch and let Vercel build a preview**

```bash
git push origin HEAD
```

Wait for the Vercel preview URL to come back (via the GitHub commit status or the Vercel dashboard).

- [ ] **Step 3: On the preview, verify the niche page**

Open `<preview-url>/n/boho-wedding-stationery`. Confirm:
- Page renders with hero, all 6 prose sections, Creative Fabrica CTA, the find-your-match CTA, and 3 related niches.
- View source: `<title>` and `<meta name="description">` match `meta_title` / `meta_description` from `niche-content.ts`. `<meta property="og:image">` points to `<preview-url>/n/boho-wedding-stationery/opengraph-image`.

- [ ] **Step 4: On the preview, verify the OG and pin images**

Open `<preview-url>/n/boho-wedding-stationery/opengraph-image` directly. Expect a 1200×630 PNG that renders correctly (Fraunces italic working, hero photo loaded, no missing-font fallback).

Open `<preview-url>/n/boho-wedding-stationery/pinterest-image`. Expect a 1000×1500 PNG.

If a font fails to render (text shows in the default sans-serif fallback), the issue is the edge font fetch in the image route. Workaround: switch `runtime = "edge"` to `runtime = "nodejs"` in the failing route — slower cold start but compatible with broader URL fetch behavior.

- [ ] **Step 5: Run the preview through opengraph.xyz**

Paste the niche page URL into [https://www.opengraph.xyz/](https://www.opengraph.xyz/). Confirm the preview shows the OG image, title, and description as expected. The preview will look the same on Twitter, iMessage, Slack, Discord, and LinkedIn.

- [ ] **Step 6: Click the Pinterest button on the preview's `/results`**

On the preview, take the quiz, land on `/results`. Click the Pinterest icon on the hero card. The new tab should open `pinterest.com/pin/create/button/?...` with:
- The pin preview thumbnail rendered (Pinterest fetches `<preview-url>/n/<slug>/pinterest-image`).
- The destination URL pre-filled.
- The description pre-filled.

If the Pinterest preview thumbnail is blank, Pinterest's fetcher couldn't load the image — usually because the preview origin is private or behind auth. Repeat against a public preview URL.

- [ ] **Step 7: Click the copy-link button**

Click the copy-link button on `<preview-url>/results`. Confirm the icon turns into a check for 2 seconds. Paste — the absolute `/n/<slug>` URL should be on the clipboard, using `NEXT_PUBLIC_SITE_URL` (or the preview origin if the env var isn't set in the preview deployment).

- [ ] **Step 8: Production env var**

Confirm `NEXT_PUBLIC_SITE_URL=https://nichefinder.io` is set in the Vercel project's Production environment. Without it, share URLs from a server-rendered card would point at `localhost:3000`. Add it via the Vercel dashboard if missing. (No commit; environment-only.)

- [ ] **Step 9: Done — merge**

If all steps above pass, the feature is complete. Open the PR for review (or merge to main if working solo).

---

## Out of scope, deliberately

- Test framework / unit tests — project has none, scope creep.
- Twitter/Reddit/email share buttons — Q4=A; future work if metrics justify.
- User-personalized "share my match" variants — Q1=A; future work.
- Pinterest pixel / analytics — separate feature.
- An in-page abridged mini-quiz on niche pages — Q3 option C, deferred.
- Programmatic image variants per platform beyond OG + Pinterest — Twitter/Slack/iMessage all reuse OG.
- Catalog expansion 25 → 150 — already on the roadmap; this work auto-picks-up new entries the next time the generation script runs.
