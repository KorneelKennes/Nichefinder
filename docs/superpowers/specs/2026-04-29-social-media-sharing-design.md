# Social Media Sharing — Design

**Status:** Approved
**Date:** 2026-04-29
**Author:** Korneel + Claude (brainstorm session)

## Goal

Make NicheFinder's result niches shareable on social media in a way that turns Pinterest into a compounding discovery channel for the app. Each share lands on a stable, indexable per-niche page that is valuable on its own (so a Pinterest visitor's click is rewarded), and which converts the visitor into a quiz-taker.

## Non-goals

- **User-personalized sharing** ("look at my 87/100 match for X") — out of scope. The share unit is the niche itself, not the user's match.
- **Twitter / Facebook / LinkedIn / Reddit / Instagram share buttons** — only Pinterest and copy-link are wired up on the result card. Twitter cards still get a clean preview via the standard OG image when someone pastes a copied link, but no Twitter share button exists.
- **Catalog expansion (25 → 150)** — already on the roadmap; this feature is built so it picks up new catalog entries automatically once `niche-content.ts` is regenerated.
- **Pinterest pixel / analytics** — separate concern.
- **An in-page abridged "is this a fit" mini-quiz** — considered, deferred. The page CTA pushes to the full `/quiz/1`.

## Why these decisions

The roadmap calls out *"Per-result Open Graph image generator | Pinterest-pinnable cards are the highest-leverage distribution channel for this audience."* The design follows that lead: Pinterest is the goal, indexable per-niche pages are the destination, an editorial pin design is the unit of distribution.

| Decision | Choice | Rationale |
|---|---|---|
| Primary share goal | Pinterest discovery / SEO | Roadmap-aligned. Etsy-seller audience lives on Pinterest. Compounds over time. |
| Share destination | Per-niche public pages at `/n/<slug>` | Stable, indexable, Pinterest+Google double-dip. `/results` is sessionStorage-bound and would waste Pinterest clicks. |
| Page weight | Substantial (~450–550 words) | Real SEO weight + rewards the click. Lighter pages won't rank against the term. |
| Buttons on the result card | Pinterest + Copy-link only | Minimum viable focus. No Twitter button — but the page still has Twitter-friendly OG meta. |
| Pin image style | Editorial / on-brand (Fraunces, brass, hero photo + 3 stats) | Brand-consistent. Compounds recognition over time. |
| Page copy source | Claude-generated, committed to catalog | Matches existing "Claude-curated catalog" pattern. Static after generation. Zero runtime cost. Hand-editable. |

## User-visible feature

### Result card share row

**On `HeroNicheCard`**, the bottom action row becomes:

1. **Find on Creative Fabrica** (primary, existing — unchanged)
2. **Save niche** (existing bookmark button — unchanged)
3. **Pinterest** (`fa-brands fa-pinterest-p`) — opens Pinterest's official "Pin It" endpoint with the niche page URL, the Pinterest pin image URL, and a one-line description. Anchor tag with `target="_blank" rel="noopener noreferrer"`.
4. **Copy link** (`fa-solid fa-link`) — copies the `/n/<slug>` absolute URL to clipboard via `navigator.clipboard.writeText()`. Icon swaps to `fa-check` for ~2 seconds as visual ack. No toast.

The existing Twitter placeholder (`fa-brands fa-twitter`) is removed.

**On `CompactNicheCard`**, the single icon button currently at the bottom (a `fa-regular fa-bookmark`) is replaced by the Pinterest action — same anchor + URL builder as on the hero. This treats "save" as "save to Pinterest", which is the Q1=A direction (Pinterest discovery is the goal). No copy-link button is added to the compact card to keep the layout tight; users wanting a link click into the full report and copy from there.

### Per-niche page (`/n/<slug>`)

A statically generated guide page for each catalog niche. Sections, top to bottom:

1. **Hero** — full-bleed niche photo, niche name (Fraunces, large), taxonomy breadcrumb, three micro-stats inline (typical price range, modeled margin, seasonality verdict).
2. **What this is** — Claude-generated description (~80–100 words).
3. **Who this is for** — Claude-generated seller-fit paragraph (~80–100 words).
4. **Why it works right now** — Claude-generated demand/competition framing (~60–80 words). Honest about which signals are modeled vs grounded.
5. **What to start with** — Catalog `default_search_query` rendered as an Etsy SERP cue, the 5 Claude-generated `product_ideas`, then a Creative Fabrica CTA button. Label and link selected by the existing `cfMeta()` logic (digital/unsure → *"Find templates to remix"*, pod → *"Find graphics for your designs"*, made/stock → *"Find fonts & mockups for your shop"*). External link, opens in new tab. Sub-label *"Creative Fabrica"*. Secondary — does not compete with the primary CTA in section 8.
6. **Watch-outs** — Claude-generated `what_to_avoid` (~50–80 words). Surfaces `policy_risk_flags` honestly when set on the catalog row.
7. **The numbers** — 4-up tabular grid: typical price range, modeled net margin %, Q4 seasonality index, year-round seasonality index.
8. **Find-your-match CTA** (primary) — *"Is this a fit for your time, budget, and aesthetic?"* + big button → `/quiz/1`.
9. **Related niches** — 3 cards selected by `aesthetic_clusters` overlap with the current niche. Each links to its own `/n/<slug>`. Internal link graph + Pinterest reading-rabbit-hole.
10. **Footer** — standard `<Footer />`.

Word count budget: ~450–550 words of prose per page.

## Architecture

### New files

```
src/
├── app/
│   └── n/
│       └── [slug]/
│           ├── page.tsx              # Per-niche guide page
│           ├── opengraph-image.tsx   # 1200×630 OG image
│           └── pinterest-image.tsx   # 1000×1500 Pinterest pin
├── data/
│   └── niche-content.ts              # Claude-generated prose, keyed by catalog id
├── lib/
│   └── share.ts                      # buildShareUrls(), copyToClipboard helper, lifted cfMeta()
└── scripts/
    └── generate-niche-content.ts     # One-shot Claude batch
```

### Modified files

- `src/components/NicheCards.tsx` — wire up Pinterest + Copy-link buttons, remove Twitter placeholder, import `cfMeta` from `lib/share.ts` instead of defining locally.
- `src/lib/types.ts` — export the new `NicheContent` type.
- `package.json` — add `"generate:niche-content": "tsx scripts/generate-niche-content.ts"` script.
- Whichever sitemap source exists (verify during implementation; if absent, add `src/app/sitemap.ts` returning the 25 niche URLs alongside existing routes).

### Routing

| Route | Type | Notes |
|---|---|---|
| `/n/[slug]` | SSG via `generateStaticParams` | All 25 catalog ids pre-rendered at build. |
| `/n/[slug]/opengraph-image` | Edge `ImageResponse` | Used as `og:image` and `twitter:image`. 1200×630. |
| `/n/[slug]/pinterest-image` | Edge `ImageResponse` | Used in Pinterest "Pin It" `media` param. 1000×1500. |

Catalog `id` is already kebab-case (e.g. `pressed-flower-stationery`), so it doubles as the `[slug]`. No new slug field needed.

`generateMetadata` per niche sets `<title>`, `<meta description>`, `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card="summary_large_image"`, `twitter:image`. Pinterest auto-discovers `og:image`; no Pinterest-specific meta required.

### Catalog content extension

New file `src/data/niche-content.ts`:

```ts
export type NicheContent = {
  description: string;          // 80-100 words, page section 2
  who_this_is_for: string;      // 80-100 words, page section 3
  why_it_works: string;         // 60-80 words, page section 4
  product_ideas: string[];      // 5 items, page section 5
  what_to_avoid: string;        // 50-80 words, page section 6
  meta_title: string;           // 50-60 chars, <title>
  meta_description: string;     // 150-160 chars, <meta description>
  pin_tagline: string;          // 4-7 words, used on the Pinterest pin
  share_description: string;    // 1-2 sentences, used in Pinterest "Pin It" URL description
};

export const NICHE_CONTENT: Record<string, NicheContent> = {
  // populated by scripts/generate-niche-content.ts, hand-edited as needed
};
```

Keys must cover every `NICHE_CATALOG[i].id`. A small runtime guard in `/n/[slug]/page.tsx` returns `notFound()` if a slug exists in the catalog but is missing from `NICHE_CONTENT`, and vice versa is enforced by Zod-validating the script's output.

### Generation script

`scripts/generate-niche-content.ts`:

1. Reads `NICHE_CATALOG` from `src/data/catalog.ts`.
2. For each entry, calls Anthropic Claude Sonnet 4.6 with a prompt that includes the catalog row (id, name, taxonomy, inventory_models, aesthetic_clusters, typical_price_range, modeled_net_margin_pct, seasonality, policy_risk_flags) and asks for the `NicheContent` fields back as JSON.
3. Validates each result with a Zod schema matching `NicheContent`. Retries once on schema fail; logs and skips on second failure (manual fill).
4. Writes the merged `Record<string, NicheContent>` map to `src/data/niche-content.ts` as a TypeScript literal, sorted by catalog order.
5. Run via `npm run generate:niche-content`.
6. Cost: ~25 niches × ~1.5K input + ~600 output tokens ≈ a few cents.

After the script runs, the human reads every output, hand-edits any rough ones, and commits. Same posture as the existing curated catalog.

### Image generation

Both images are Next.js `ImageResponse` route handlers (the `opengraph-image.tsx` / file convention). Edge runtime. No build-time image pipeline. The hero photo is the existing Unsplash URL from the catalog row, fetched and embedded into the JSX tree the runtime renders.

**Pinterest pin** (1000×1500, 2:3):

- Top ~60% (1000×900): hero photo full-bleed (`<img>` inside the JSX tree), subtle dark gradient overlay at the lower edge for legibility.
- Middle band (~1000×450): cream `var(--cream)` background. Niche name in Fraunces italic (~88px). Below: `pin_tagline` from `NICHE_CONTENT` (e.g. *"a low-competition Etsy niche"*). Below: three-stat row in tabular numerals (`{inventory_label} · ${price_range} startup · ~{margin}% margin`).
- Bottom band (~1000×150): brass hairline rule, `nichefinder` wordmark left, `nichefinder.app` URL right.

**Standard OG** (1200×630, 1.91:1):

- Left half: hero photo, full-bleed.
- Right half: cream. Niche name (Fraunces italic, large). Tagline. `nichefinder` wordmark bottom.

Fonts loaded inside the route handlers via `fetch` (Fraunces + Inter, the same `next/font/google` pair the site uses, served from Google Fonts directly for the edge runtime).

### Share helper (`src/lib/share.ts`)

```ts
export function buildShareUrls(niche: ResultNiche | CatalogNiche): {
  pageUrl: string;          // absolute /n/<slug>
  pinterestUrl: string;     // pinterest.com/pin/create/button/?url=...&media=...&description=...
};

export function cfMeta(niche: { name: string; cf_query: string; inventory_model?: InventoryModel; inventory_models?: InventoryModel[] }): {
  url: string;
  label: string;
  sub: string;
};
```

`cfMeta()` is lifted verbatim from `NicheCards.tsx`, generalized to accept either `inventory_model` (from `ResultNiche`) or `inventory_models[]` (from `CatalogNiche`). When both are provided, `inventory_model` wins; when only `inventory_models` is set, the first entry is used; when neither is set, the function falls back to the digital/unsure label ("Find templates to remix"). The function in `NicheCards.tsx` is removed in favor of importing from `lib/share.ts`. The niche page uses the same helper for its section 5 CTA.

`buildShareUrls()` reads `NEXT_PUBLIC_SITE_URL` for the absolute origin. If unset (e.g. local dev), falls back to `window.location.origin` on the client and `http://localhost:3000` on the server. Add `NEXT_PUBLIC_SITE_URL` to `.env.example` and document it as required for production.

## Build sequence

1. **Catalog content scaffolding** — type, Zod schema, generation script. Run script. Hand-edit. Commit.
2. **Share helper** — `src/lib/share.ts`. Lift `cfMeta()` from `NicheCards.tsx`. Add `buildShareUrls()` and `copyToClipboard()`.
3. **Niche page route** — `src/app/n/[slug]/page.tsx` with `generateStaticParams` + `generateMetadata`. All 10 sections.
4. **Image routes** — `opengraph-image.tsx` and `pinterest-image.tsx`. Test by hitting the route URLs directly and via opengraph.xyz on a deployed preview.
5. **Wire share buttons** — update `HeroNicheCard` and `CompactNicheCard` in `NicheCards.tsx`. Remove Twitter placeholder.
6. **Sitemap** — verify existence; if absent add `src/app/sitemap.ts`.
7. **Smoke test** — deployed preview. Click the Pinterest button on a result card, confirm pin renders correctly. Paste a `/n/<slug>` URL into iMessage/Slack/Twitter, confirm OG preview.

## Risks & open verifications

- **`NEXT_PUBLIC_SITE_URL`** — verify whether it already exists; add to `.env.example` if not.
- **Sitemap** — verify existing setup; no sitemap currently obvious in the project structure, so likely needs to be added.
- **`ImageResponse` font loading at edge** — Fraunces variable font may need a non-variable subset for `ImageResponse`. Worst case, fall back to a static Fraunces weight TTF fetched from Google Fonts.
- **Pinterest "Pin It" URL behavior** — open in same tab vs new tab differs by browser. Anchor with `target="_blank"` is correct; verify on iOS Safari which has special handling.
- **Hero photo licensing for derived images** — niche photos are hot-linked from Unsplash under their permissive license (per README), which permits transformation. The pin and OG images render the photo into a derived composition; this is within Unsplash license terms.
- **Catalog item missing from `NICHE_CONTENT`** — `/n/[slug]/page.tsx` returns `notFound()`. Generation script's Zod validation logs and skips on failure, so a missing entry is visible.

## Out of scope, captured for the roadmap

- User-personalized share variants ("share your match")
- Twitter / Reddit / Email share buttons on the result card
- In-page abridged mini-quiz on niche pages (Q3 option C)
- Pinterest pixel / analytics
- Programmatic platform-specific image variants beyond Pinterest pin + standard OG

---

*Brainstorming session: 2026-04-29. Six clarifying questions, two-section design walkthrough. Approved before writing.*
