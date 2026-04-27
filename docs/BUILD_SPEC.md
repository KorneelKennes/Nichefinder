# NicheFinder — MVP Build Spec v2

> Single-source build document for an AI-powered Etsy niche discovery tool, built as a satellite-app prototype for the Creative Fabrica *Vibe Coder — Satellite Apps Marketer* role.
>
> Replaces `EtsyNicheFinder_Full_Spec.md` (v1). Incorporates findings from market research on Etsy seller tools, Etsy's trademark and API policies, the Creative Fabrica brand and product line, and the visual landscape of the category as of April 2026.

---

## How to use this document

- **For design generation in Claude (chat / artifacts):** paste sections 1, 4, 9, 10. Say *"produce designs for these screens at the spec given."* Skip the technical sections.
- **For Claude Code build agents:** paste the whole document. Reference section 11 for phase-by-phase commands.
- **For the Creative Fabrica pitch:** sections 1 and 14 are the core. The rest is the proof of work.

---

## TABLE OF CONTENTS

0. Answer first — which APIs do you actually need
1. North star
2. Scope — what's in and out for MVP
3. The stack
4. Information architecture
5. The quiz — full spec
6. The scoring methodology
7. The data pipeline (Firecrawl + Claude)
8. The Claude prompt
9. Brand & visual system
10. Page-by-page design spec
11. Build order for Claude Code
12. SEO & programmatic pages
13. Post-launch distribution
14. Creative Fabrica pitch
15. Appendix — domain options, edge cases, risks

---

## 0. ANSWER FIRST: WHICH APIs DO YOU ACTUALLY NEED?

The MVP runs on **two APIs**: Anthropic Claude (the brain) and Firecrawl (the eyes). Everything else is optional, deferred, or skip.

### The minimum viable stack

| Service | Status | Why | MVP Cost |
|---|---|---|---|
| Anthropic Claude API | **Required** | Synthesis layer. Generates recommendations and reasoning. Default: `claude-sonnet-4-5`. | ~$0.02 / quiz |
| Firecrawl API | **Required** (already in your toolkit) | Replaces Etsy API + Pinterest API + Reddit API for MVP. | ~$0.005 / quiz (cached) |
| Vercel hosting | Required | Deploy + Edge Functions + Analytics. Free tier sufficient. | $0 |
| Vercel KV or Edge Config | Recommended | Cache Firecrawl results 24h per keyword. ~10× cost reduction. | $0 free tier |
| Resend (email capture) | Optional | Only if email flow must function end-to-end for the demo. | $0 (3k/mo free) |
| Vercel Analytics | Recommended | Free, no cookie banner needed. | $0 |
| Plausible / PostHog | Skip | Vercel Analytics is enough for an MVP. |
| Etsy Open API | **Skip** | OAuth dance, partial overlap with Firecrawl, 2024 ToS forbids analytics use. |
| Pinterest Trends API | **Skip for MVP** | 1–3 day app approval, defer to v2. Firecrawl handles Pinterest for now. |
| Reddit / TikTok APIs | **Skip** | Marginal value vs. complexity. |
| Google Trends (pytrends) | Optional, late-add | Free but flaky. Add only if Etsy-only signal feels thin. |

### Why Firecrawl alone covers the data layer

Firecrawl handles the four data needs of the MVP:

1. **Listings count** — scrape `etsy.com/search?q={keyword}` → parse the "X results" string.
2. **Top 10 listings** — same page → titles, prices, review counts, listing ages.
3. **Related searches** — same page → Etsy's "related searches" sidebar = real buyer language.
4. **Pinterest leading signal** (optional) — `pinterest.com/search/pins/?q={keyword}` → scrape pin density.

That's the entire data backbone. **Claude is the brain. Firecrawl is the eyes. The static niche catalog (a curated 150–200 niche JSON file shipped with the app) is the skeleton.**

### What *not* to claim on the marketing site

The original v1 spec said *"we analyzed 8 million Etsy listings."* Don't say this. It is a legal red flag — incumbents like eRank and EverBee operate in this gray zone and have received C&D letters. The honest framing is also the stronger pitch:

> *Real-time Etsy listing data via Firecrawl. Public Pinterest and search-trend signals. Claude (Anthropic) reasoning across them. We don't pretend to have data Etsy doesn't expose — we synthesize what's publicly visible, and we show our work.*

The "show our work" piece becomes a feature on every result card.

---

## 1. NORTH STAR

### What we are building

A free, no-signup AI tool that helps an aspiring Etsy seller go from *"I have no idea what to sell"* to *"these are the three niches that match my time, budget, skills, and aesthetic — here's exactly what to make first."* In under 90 seconds.

### Who it is for

The pre-shop Etsy researcher. Has an interest, maybe equipment, definitely no shop yet. Roughly 80% women, age 28–45, spending hours on YouTube watching *"how I made $10k/month on Etsy"* videos and getting nowhere. Pinterest-native, taste-driven, frequently overwhelmed by Sale Samurai's sword imagery and eRank's spreadsheet UI.

### Why this beats the existing tools

Every incumbent (Sale Samurai, eRank, Alura, EverBee, Marmalead, InsightFactory) is a *retention* tool for sellers who already have shops. They demand a connected store, a seed keyword, or a paid plan to do anything useful. **Nobody serves the pre-shop user well.** That's the wedge.

The secondary wedge is taste. Every incumbent has a mascot or a spreadsheet aesthetic. NicheFinder looks like a curated magazine instead.

### Why this demonstrates the Vibe Coder role

The Creative Fabrica role is 50% growth / 40% build / 10% strategy. Every part of this project is designed to demonstrate all three:

- **Growth:** SEO-first architecture with programmatic pages, Pinterest-pinnable result cards, an email funnel, a clear path from organic search → quiz → Creative Fabrica.
- **Build:** Shipped in days, not weeks. Real LLM synthesis (not just prompt-template wrapping). Honest data backbone.
- **Strategy:** Identified white space in the category. Defensible legal posture. Scalable to other marketplaces (Shopify, Amazon Handmade, CF's own marketplace).

---

## 2. SCOPE — WHAT'S IN AND OUT FOR MVP

| In scope (MVP) | Out of scope (v2 or later) |
|---|---|
| Single-page quiz, 8 questions in 5 steps | Account creation, login, OAuth |
| 3 niche recommendations per session | Saved history, dashboards |
| Static niche catalog (~150 niches) | Dynamic niche discovery |
| Firecrawl-grounded Etsy data | Etsy OAuth integration |
| Claude-synthesized recommendations | Multi-marketplace support |
| Email capture (deferred, post-result) | Subscription tiers, paid features |
| 4 SEO landing pages (beginners, trending, low-competition, digital-products) | Full programmatic SEO build (50+ pages) |
| "How we scored this" expandable on each card | Real-time data visualizations |
| Pinterest, Twitter/X, copy-link share | Native social embeds, OG image generator |
| Light/single light theme | Dark mode |
| English only | i18n |
| Desktop + mobile responsive | Native apps |

**Hard constraints for MVP:** total Claude cost cap of $50, total Firecrawl cost cap of $25, 1-day-of-focused-work build (8–12 hours), zero database (everything in URL state, localStorage, and Vercel KV cache).

---

## 3. THE STACK

```
Framework:       Next.js 15 (App Router)
Styling:         Tailwind CSS 4
Animation:       Framer Motion (selectively — most motion is CSS)
Forms:           React Hook Form + Zod validation
AI:              Anthropic SDK, claude-sonnet-4-5
Data:            Firecrawl SDK (already provisioned)
Cache:           Vercel KV (24h TTL on Firecrawl results)
Email:           Resend (free tier) — optional
Analytics:       Vercel Analytics (free)
Deployment:      Vercel
DNS:             Cloudflare
Fonts:           Fraunces (Google Fonts), Inter (Google Fonts)
Icons:           Lucide React (selectively)
```

### Cost projections

```
Per user (full quiz):   $0.025  (Claude $0.02 + Firecrawl ~$0.005)
1,000 users:            $25
10,000 users:           $250
Cap for MVP:            $50  →  ~2,000 quizzes
```

### Why each choice

- **Sonnet 4.5 over Opus**: 5× cheaper, fast enough, quality is more than sufficient for this task with a strong prompt and good grounding data.
- **Firecrawl over building scrapers**: it handles user-agent rotation, JS rendering, retries, and rate limits. Saves a day.
- **Vercel KV over Redis/Postgres**: zero ops, free tier covers MVP.
- **Resend over ConvertKit**: free tier, dev-friendly, no marketing dashboard bloat.
- **Tailwind v4 over v3**: native CSS variables, better DX, current as of 2026.
- **Fraunces over Playfair Display**: more 2024–2026 aesthetic, better screen rendering at large sizes, has the same editorial feel without the period-piece weight.
- **No JetBrains Mono**: it pulls the design toward developer aesthetic, which works against the editorial/feminine-creative positioning.

---

## 4. INFORMATION ARCHITECTURE

### Routes

```
/                       Landing
/quiz/1                 Q1: Goal
/quiz/2                 Q2: Time + Q3: Capital (combined screen)
/quiz/3                 Q4: Inventory model + Q5: Skills (combined screen)
/quiz/4                 Q6: Equipment (conditional) + Q8: Timeline
/quiz/5                 Q7: Aesthetic
/quiz/email             Email gate before reveal
/analyzing              Loading + animation
/results                Three niche cards + share + secondary CTA
/results/[id]           Optional deep-dive on a single niche (v1.1 nice-to-have)

# SEO landing pages (all reuse the same flow with pre-filled state)
/beginners              Pre-fills Q1=passion, Q2=1-5h, Q3=under-100
/trending               Hero swap, no pre-fill, includes trends widget
/low-competition        Pre-fills toward saturated-niche-aware scoring
/digital-products       Pre-fills Q4=digital, Q3=under-100

# Static
/methodology            How we score (transparency page — doubles as SEO)
/about                  Who built this, why it's free
/privacy                Standard
```

### State flow

```
Quiz answers → URL search params (shareable, bookmarkable)
              → POST /api/generate-niches with full payload
              → Server: load static catalog → filter by Q4/Q6 →
                Firecrawl top 5–8 candidates (parallel, cached) →
                Pass profile + signals to Claude → Parse JSON → return
              → Client renders /results with returned data
              → Client also writes result to localStorage for return visits
```

### Performance targets

```
Lighthouse score:        95+
LCP:                     < 2.0s
Quiz transition:         < 100ms
API end-to-end:          5–8s (intentionally — labor illusion)
Bundle (initial):        < 150kb
```

---

## 5. THE QUIZ — FULL SPEC

8 questions across 5 visible steps, plus a welcome screen and an email gate. Past the labor-illusion floor where AI outputs feel earned, well below the fatigue cliff where drop-off accelerates.

### Question matrix

| # | Question | Type | Required | Conditional |
|---|---|---|---|---|
| W | Welcome screen | screen | — | always |
| 1 | What's the dream here? | single-select, 4 tiles | yes | always |
| 2 | Hours per week? | single-select | yes | always |
| 3 | Starting budget? | single-select | yes | always |
| 4 | How do you want to handle products? | single-select, 4+1 tiles | yes | always |
| 5 | Which of these can you actually do? | multi-select | yes | always |
| 6 | What gear do you have? | multi-select | yes | only if Q4 ∈ {made-to-order, stock} or Q5 has hands-on craft |
| 7 | Which vibe is most you? Pick top 2. | image multi-select, max 2 | yes | always |
| 8 | When do you need this to start working? | single-select | yes | always |
| E | Email gate | input | yes | always |
| R | Loading reveal + 3 niche cards | screen | — | always |

### Full copy

#### Welcome (W)

```
Headline:    Find your perfect Etsy niche in 60 seconds.
Sub:         Eight questions. Three niches matched to your time,
             budget, skills, and taste. No signup until the end.
CTA:         Begin →
Tiny line:   Free. Honest data. No spam.
```

#### Q1 — Goal

```
Headline:    What's the dream here?
Sub:         Pick the one closest to true.

Options (single-select, 4 tiles with small illustration each):
  A. A creative side project that pays for itself
  B. Real side income — a few hundred to a few thousand a month
  C. Replace my day job within a year or two
  D. Build a brand I'm proud of, money is secondary
```

#### Q2 — Time

```
Headline:    Realistically, how much time can you give this each week?
Sub:         Be honest, not aspirational.

Options (single-select):
  • 1–5 hours
  • 5–15 hours
  • 15–30 hours
  • 30+ hours (this is my main thing)
```

#### Q3 — Capital

```
Headline:    What can you invest to get started?
Sub:         Materials, software, listing fees, ads.

Options (single-select):
  • Under $100 — keep it lean
  • $100–500
  • $500–2,000
  • $2,000+
```

#### Q4 — Inventory model

```
Headline:    How do you want to handle products?
Sub:         There's no wrong answer — this just shapes what we recommend.

Options (single-select, 4 tiles + 1):
  A. Digital downloads only — design once, sell forever
  B. Print-on-demand — partner prints and ships for me (Printful, Printify)
  C. Made-to-order by hand — I make each order myself
  D. Stock physical inventory — I make in batches and ship
  E. Not sure yet — show me what fits

Microcopy below each option (revealed on hover/focus, not shown by default):
  A: "Highest margin, lowest effort. Saturated in some categories."
  B: "Low risk, no inventory. Margins are tighter."
  C: "Highest perceived value. Time-intensive."
  D: "Capital-intensive. Best margins on physical goods."
```

#### Q5 — Skills

```
Headline:    Which of these can you actually do?
Sub:         Check all that apply — be honest, not aspirational.

Options (multi-select checkboxes, grouped):

  DESIGN
    □ I'm comfortable in Photoshop, Illustrator, or Affinity
    □ I use Canva confidently
    □ I can use AI design tools (Midjourney, CF Spark, etc.)
    □ I can illustrate / draw / paint

  CRAFT
    □ Sewing, quilting, or fabric work
    □ Jewelry making (metalwork, beading, resin)
    □ Pottery, ceramics, or sculpting
    □ Woodworking, leatherwork, or carving
    □ Embroidery, cross-stitch, or fiber arts
    □ Candle, soap, or bath product making

  OTHER
    □ Photography
    □ Hand lettering or calligraphy
    □ I'm starting from zero — teach me as we go
```

#### Q6 — Equipment (CONDITIONAL)

Show only if Q4 ∈ {made-to-order, stock} OR Q5 includes any CRAFT option.

```
Headline:    What gear do you actually have access to right now?
Sub:         Owned, borrowed, or in your local makerspace all count.

Options (multi-select):
  □ Home printer (inkjet or laser)
  □ Cricut, Silhouette, or other cutting machine
  □ Sewing machine
  □ Embroidery machine
  □ Sublimation printer + heat press
  □ Kiln or pottery wheel
  □ 3D printer
  □ Camera (DSLR/mirrorless) for product photography
  □ None of the above (yet)
```

#### Q7 — Aesthetic

```
Headline:    Which vibe is most you?
Sub:         Pick your top 2. This shapes what your shop will look like.

Options (visual tiles, image-led, max 2):
  • Cottagecore — soft, rural, romantic
  • Dark academia — moody, scholarly, vintage
  • Modern minimalist — clean, neutral, structural
  • Boho — earthy, layered, eclectic
  • Y2K — playful, bright, nostalgic-2000s
  • Kawaii — cute, soft pastels, cheerful
  • Witchy / mystical — celestial, herbal, occult
  • Coquette — feminine, ribbons, soft pinks
  • Maximalist — bold, layered, color-rich
  • Evergreen — no specific vibe, broad appeal
```

This question matters more than any other for output quality, because aesthetic differentiation is the dominant non-functional signal on a 7-million-seller marketplace. Image tiles are non-negotiable — text-only aesthetic selectors test poorly because the audience can't reliably name a vibe they recognize visually.

#### Q8 — Timeline

```
Headline:    When do you need this to start working?
Sub:         No judgment — this changes which niches we recommend.

Options (single-select):
  • In the next 30 days — I need momentum fast
  • 2–3 months — I'm willing to build a foundation
  • 6–12 months — I'm playing the long game
  • No deadline — I'm exploring
```

#### Email gate (E)

```
Headline:    One last thing — where should we send your match?
Sub:         You'll get your three niches now. We'll also send a 
             monthly trend report if you opt in.

Field:       Email
Checkbox:    □ Send me the monthly trend report (one email, no spam)
CTA:         Reveal my niches →

Tiny line:   Don't want to share? [Skip and just show me] (link)
```

The skip link is intentional. Forced gates kill goodwill. The conversion lift from making it optional but present is roughly equivalent to a hard gate, with much better social sentiment.

#### Loading reveal (R)

```
Animation:   Soft rotating SVG (circle morphing into three squares)
Duration:    6–8 seconds total

Cycling text (italic Fraunces, fade in/out, 1.6s per line):
  1. "Matching your skills to 184 Etsy niches…"
  2. "Cross-referencing real-time listing data…"
  3. "Filtering by your time and budget…"
  4. "Finalizing your top three…"

Progress bar (antique brass, fills 0→100% over the duration)
```

The 6–8 second duration is deliberate. Faster feels suspicious; slower feels broken. The labor illusion peaks around 7 seconds with a progress affordance. The animation runs while the actual API call happens in parallel — if the call finishes early, hold; if it takes longer than 8s, extend with "Almost there…" until ready.

---

## 6. THE SCORING METHODOLOGY

A defensible 0–100 score with eight components. Lives on the `/methodology` page (transparency + SEO doubling) and is referenced inside every result card.

### Components and weights

| Component | Weight | Inputs |
|---|---|---|
| Demand | 25 | Listings count vs search density, Pinterest pin volume, related-search depth |
| Competition (inverted) | 20 | Total active listings, top-10 review concentration, listing age distribution |
| Margin economics | 20 | Average sale price, modeled net margin after Etsy fees, free-shipping eligibility |
| Repeat / LTV | 10 | Consumable vs decorative, hobby-driven repurchase, bundle potential |
| Seasonality | 10 | Year-round baseline + Q4 amplification |
| Ad cost recovery | 10 | Profitable at 15% Offsite Ads attribution? |
| Policy risk (penalty) | up to −15 | AI-content reliance, third-party templates, trademark adjacency |
| Whitespace bonus | up to +15 | Identifiable underserved sub-niche, hyper-personalization angle |

### Etsy 2026 fee stack (built into margin calc)

```
Listing fee:           $0.20 per listing (4-month TTL)
Transaction fee:       6.5% of item + shipping
Payment processing:    3% + $0.25 (US — varies by country)
Offsite Ads (when triggered):  12–15%
```

### Decision thresholds

```
80–100   High confidence — enter
60–79    Viable with strong differentiation
40–59    Risky — only if you have a unique angle
< 40     Avoid for now
```

### Honest disclosure

For an MVP, you cannot compute every component from first-party data. **What's grounded in real Firecrawl data:** demand (listings count, related searches), competition (top-10 review counts and ages). **What's modeled from the catalog + fee stack:** margin economics, seasonality, LTV. **What Claude reasons about with profile context:** policy risk, whitespace bonus, fit.

The result card has a "How we scored this" expander that shows which components were grounded vs. modeled vs. reasoned. This is both a labor-illusion play and a defensibility play.

---

## 7. THE DATA PIPELINE (FIRECRAWL + CLAUDE)

### Pipeline steps

```
1. User completes quiz → POST /api/generate-niches with profile JSON

2. Server loads static catalog (data/niches.json — ~150 entries)

3. Server filters catalog by Q4 (inventory model) and Q6 (equipment).
   Returns ~15–25 candidate niches.

4. Server scores candidates against profile (rule-based pre-rank,
   not Claude). Picks top 8 candidates by pre-score.

5. For each of the 8 candidates, in parallel:
   - Check Vercel KV cache for {niche.search_query} (24h TTL)
   - If miss: Firecrawl GET etsy.com/search?q={query}
   - Parse: total_listings, top_10 (title, price, review_count, age),
     related_searches[]
   - Cache result

6. Server builds the Claude prompt with:
   - Full seller profile
   - 8 candidate niches with their static metadata + scraped Firecrawl data
   - System prompt (see section 8)

7. Server calls Claude (Sonnet 4.5, max_tokens 2500, temp 0.4)

8. Parse JSON response. Validate schema. Return top 3 to client.

9. Client renders /results.
```

### The static niche catalog

A JSON file shipped with the app, ~150 entries. Each entry:

```json
{
  "id": "boho-wedding-stationery",
  "name": "Boho Wedding Stationery",
  "etsy_taxonomy": ["Paper & Party Supplies", "Paper", "Stationery"],
  "inventory_models": ["digital", "print-on-demand"],
  "required_skills": ["design-digital", "design-canva"],
  "required_equipment": [],
  "aesthetic_clusters": ["boho", "cottagecore"],
  "typical_price_range": [8, 45],
  "modeled_net_margin_pct": 0.78,
  "seasonality_index_q4": 0.9,
  "seasonality_year_round": 0.7,
  "policy_risk_flags": [],
  "default_search_query": "boho wedding invitation",
  "etsy_search_url": "https://www.etsy.com/search?q=boho+wedding+invitation"
}
```

How to build the catalog: this is a 2-hour task. Use Claude (in chat) to generate an initial 200-niche list across the 12 core Etsy categories, then trim to the 150 strongest. Store in `/data/niches.json`. **The catalog is the durable IP of this tool** — incumbents have data, you have curation.

### Firecrawl usage example

```typescript
// /lib/firecrawl.ts
import FirecrawlApp from '@mendable/firecrawl-js';

const fc = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function scrapeEtsySearch(query: string) {
  const cacheKey = `etsy:${query}`;
  const cached = await kv.get(cacheKey);
  if (cached) return cached;

  const url = `https://www.etsy.com/search?q=${encodeURIComponent(query)}`;
  const result = await fc.scrapeUrl(url, {
    formats: ['markdown', 'extract'],
    extract: {
      schema: {
        total_listings: 'number',
        top_listings: [{ title: 'string', price: 'string', reviews: 'number' }],
        related_searches: ['string']
      }
    }
  });

  await kv.set(cacheKey, result.extract, { ex: 86400 }); // 24h
  return result.extract;
}
```

Firecrawl's structured extraction (`extract` with a schema) is the right tool here — it returns parsed JSON, not raw HTML to regex through. Saves significant code.

### Caching strategy

- Per-keyword TTL: 24 hours.
- Cache hit rate target: > 70% after first 100 users.
- Cap on Firecrawl calls per quiz: 8 (one per candidate niche).
- If Firecrawl fails on a niche, gracefully degrade — pass `null` to Claude with `signal_unavailable: true` flag, and Claude is instructed to mark that niche's scoring confidence as reduced.

---

## 8. THE CLAUDE PROMPT

### System prompt

```
You are a niche-research analyst for aspiring Etsy sellers. You produce 
recommendations only from the candidate niches provided in CONTEXT. You 
score each on the 8-component framework below and explain your reasoning 
in the seller's own resource terms. You never invent search volumes, 
seller revenues, or trends. When a signal is missing, you say so.

Scoring framework (sum to 0–100, with adjustments):
  Demand              — up to 25 points
  Competition (inv)   — up to 20 points
  Margin economics    — up to 20 points
  Repeat / LTV        — up to 10 points
  Seasonality         — up to 10 points
  Ad cost recovery    — up to 10 points
  Policy risk penalty — up to −15 points
  Whitespace bonus    — up to +15 points

Decision thresholds: 80+ enter, 60–79 viable, 40–59 risky, <40 avoid.

Hard rules:
- Recommend only from the candidates provided. Do not invent niches.
- Reference at least 2 specific seller profile inputs in each "why this fits you".
- Reference at least 1 specific Firecrawl signal in each recommendation.
- If Firecrawl data is missing for a candidate, score with reduced 
  confidence and state which signals were unavailable.
- Never recommend niches with active policy_risk_flags.
- Aesthetic match must overlap the seller's top-2 aesthetic picks. If no 
  candidates overlap, recommend the closest and flag the mismatch honestly.

Voice: confident but warm. Editorial, not hype. No "skyrocket", "crush", 
"dominate". Short paragraphs.
```

### User prompt template

```
SELLER PROFILE
Goal:               {q1}
Hours/week:         {q2}
Starting budget:    {q3}
Inventory model:    {q4}
Skills:             {q5_list}
Equipment:          {q6_list_or_none}
Top-2 aesthetic:    {q7_top2}
Timeline:           {q8}
Geography:          {auto_geo_from_ip}

CANDIDATE NICHES (8 candidates, pre-filtered by inventory_model + equipment)
{for each candidate, include:}
  - id, name, etsy_taxonomy
  - aesthetic_clusters, typical_price_range
  - modeled_net_margin_pct, seasonality
  - policy_risk_flags
  - FIRECRAWL DATA (live):
      total_listings: {n}
      top_10_avg_reviews: {n}
      top_10_avg_age_months: {n}
      related_searches: [{up to 8}]
      OR signal_unavailable: true

TASK
1. Filter candidates by hard rules (aesthetic overlap, policy risk).
2. Score each remaining candidate 0–100 with sub-scores.
3. Return the top 3 in score order.
4. For each, write a 90–120 word "why this fits you" referencing ≥2 
   profile inputs and ≥1 Firecrawl signal.
5. For each, give a startup_cost estimate, time_to_first_sale, and 5 
   product_ideas tuned to the seller's top-2 aesthetic.

OUTPUT — JSON only, matching this schema:
{
  "niches": [
    {
      "id": string,
      "name": string,
      "score": number,            // 0–100
      "sub_scores": {
        "demand": number,         // 0–25
        "competition": number,    // 0–20
        "margin": number,         // 0–20
        "ltv": number,            // 0–10
        "seasonality": number,    // 0–10
        "ad_recovery": number,    // 0–10
        "policy_penalty": number, // ≤ 0
        "whitespace_bonus": number// ≥ 0
      },
      "confidence": "high" | "medium" | "low",
      "missing_signals": [string],
      "why_this_fits_you": string,
      "startup_cost": string,     // e.g., "$80–150 in software + initial listings"
      "time_to_first_sale": string, // e.g., "2–4 weeks with consistent uploads"
      "product_ideas": [string, string, string, string, string],
      "policy_risk_notes": string | null
    }
  ]
}
```

### Why this prompt is different from v1

Three structural changes:

1. **Candidates are pre-filtered by code, not invented by Claude.** This bounds hallucination, makes the system reproducible, and lets Firecrawl ground the scoring with real data.
2. **The seller's profile is referenced explicitly in the output.** "Because you have a Cricut and 15 hours a week, this works…" is the strongest trust signal a recommender can produce.
3. **The model declares missing signals.** Instead of confidently making things up, it surfaces uncertainty. This becomes a UI feature: "scored with medium confidence — Pinterest data unavailable for this niche."

### Cost discipline

```
Avg input tokens:       ~3,500  (system + profile + 8 candidates with FC data)
Avg output tokens:      ~1,800  (3 niches × ~600 tokens each)
Sonnet 4.5 cost:        ~$0.038 per call
With prompt caching:    ~$0.022 per call (system prompt cached across users)
```

---

## 9. BRAND & VISUAL SYSTEM

### Name & domain decision

The original spec proposed `etsynichefinder.com`. **This is a hard no.** Etsy's Trademark Policy (effective 2022, still active 2026) explicitly forbids "Etsy" in any domain. Even API-integrated tools like Sale Samurai must carry the *"Etsy is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy"* disclaimer, and that disclaimer does not authorize "Etsy" in the domain string.

**Recommended primary domain:** `nichefinder.io` (or `.app` if `.io` is taken). Clean, ownable, brandable beyond Etsy when v2 expands to Shopify, Amazon Handmade, or Creative Fabrica's marketplace. The SEO for "etsy niche finder" will come from content and programmatic pages, not exact-match domain.

**Backups, in order:**
1. `findyourniche.com` — emotional, second-person, slightly long.
2. `whattosell.shop` — direct, descriptive, .shop TLD reads on-theme.
3. `nicherank.app` — punchy, defensible, but reads similar to eRank.

The marketing hero should still target "what to sell on etsy" as the primary keyword, just not in the URL.

### Voice

Confident, warm, editorial. Never *skyrocket, crush, dominate, unlock, hack*. Prefer *find, see, match, discover*. Sentences are short. Italics carry one word per sentence — emphasis is a scarce resource.

Reference points: Linear's product copy, Are.na's tone, Kinfolk's editorial register, Notion's onboarding.

### Color palette

```
Background          #F7F2E8   warm cream
Background secondary #EFE7D6   slightly deeper cream for sections
Ink (primary text)  #2A201A   warm espresso (not pure black)
Ink muted           #6B6660   warm gray
Antique brass       #B8893A   primary accent (CTA, links, scores high)
Brass hover         #D4A24A   hover state
Terracotta          #C25A3C   secondary accent — alerts, "needs work"
Sage                #8A9A7B   positive scoring data, "good"
Faded clay          #C77A5A   warning data, between sage and terracotta
Hairline            #E5DCC8   borders, dividers
```

The original v1 palette of cream + warm black + gold was directionally right but read too austere. Espresso instead of black, antique brass instead of metallic gold, plus a single muted accent (terracotta) and a positive color (sage) brings it into Pinterest-native territory without losing the editorial spine.

### Typography

```
DISPLAY — Fraunces (Google Fonts)
  Hero headline:        clamp(48px, 7vw, 96px), weight 400, italic on emphasis
  Section title:        clamp(32px, 4vw, 48px), weight 400
  Niche name:           28px, weight 500
  Card heading:         22px, weight 500

BODY — Inter (Google Fonts)
  Body large:           18px, weight 400, line-height 1.6
  Body:                 16px, weight 400, line-height 1.6
  Body small:           14px, weight 400
  Label / caption:      13px, weight 500, letter-spacing 0.04em, uppercase

  No JetBrains Mono. The mono treatment in v1 pulled the design toward a 
  developer aesthetic that fights the editorial positioning.
  
  For numbers and scores, use Inter at weight 500 with tabular-nums 
  (CSS: font-variant-numeric: tabular-nums).
```

Why Fraunces over Playfair Display: Fraunces is built for variable use, has better optical sizes for screens, and reads more 2024–2026 than Playfair, which has become slightly overused in heritage-brand territory.

### Spacing and layout

```
Container max-width:     1180px
Section padding y:       clamp(80px, 12vw, 160px)
Card padding:            clamp(28px, 4vw, 48px)
Card border-radius:      14px
Hairline border:         1px solid #E5DCC8
Grid gap:                clamp(20px, 3vw, 40px)
Page horizontal pad:     clamp(20px, 4vw, 64px)
```

### Motion principles

```
Default ease:            cubic-bezier(0.4, 0, 0.2, 1)
Default duration:        320ms
Hover lift (cards):      translateY(-3px), shadow grow
Score bar fill:          900ms with 80ms stagger between bars
Page transitions:        220ms fade
Loading text cycle:      1.6s per line, fade in/out

Reduced motion:          honor prefers-reduced-motion — disable lifts and 
                         autoplay animations, keep functional transitions.
```

### Component primitives needed

```
/components/ui
  Button.tsx           variants: primary (brass), secondary (outlined), ghost
  Card.tsx             default, with-hover-lift, with-divider
  Tile.tsx             selectable image+text card for quiz answers
  ScoreBar.tsx         animated fill, color from score (sage/clay/terracotta)
  CycleText.tsx        cross-fading text rotator for loading screen
  Pill.tsx             small label component for tags, signals
  Expand.tsx           "How we scored this" disclosure
  EmailInput.tsx       email + button inline
  ShareRow.tsx         pinterest, twitter, copy-link

/components/quiz
  QuizLayout.tsx       single column, progress dots top, back button bottom-left
  Question.tsx         headline + sub + options
  ProgressDots.tsx     5 dots, current filled brass

/components/results
  NicheCard.tsx        full result card (see section 10)
  ConfidencePill.tsx   "high / medium / low confidence" indicator
  MethodologyExpand.tsx
```

---

## 10. PAGE-BY-PAGE DESIGN SPEC

### Landing (/)

Single viewport hero, generous breathing room. Below the fold: how it works, social proof when available, footer.

```
[NAV]
  Left:   "nichefinder" wordmark in Fraunces italic, weight 400
  Right:  How it works · Methodology · Begin (button, brass)
  Behavior: transparent on hero, solid background on scroll

[HERO — 100vh, centered, max-width 980]
  
  [Tiny label, espresso, all caps, letter-spaced]
  FREE · NO SIGNUP UNTIL THE END · 60 SECONDS
  
  [Massive headline, Fraunces, italic on the emphasis word]
  See what *sells* before you make it.
  
  [Subhead, body large, italic, max-width 620, ink-muted]
  Eight questions. Three Etsy niches matched to your time, budget,
  skills, and taste. With the actual numbers behind each.
  
  [CTA — primary button, brass, large]
  Begin →
  
  [Tiny line below button, ink-muted]
  Honest data. Real Etsy listings. Claude reasoning. No fluff.

[BELOW FOLD — How it works, 3 columns, 80vh]
  
  01 / Tell us about you
  Eight questions, 60 seconds. The questions matter — they're how 
  we avoid generic answers.
  
  02 / We pull real Etsy data
  We check live listings, recent sales, and search demand for the 
  niches that match your profile.
  
  03 / Get three niches with reasoning
  Each one comes with a score, our methodology, and five product 
  ideas to start with.

[FOOTER]
  See section 10.7
```

The hero headline candidates, by recommendation strength:

1. **"See what *sells* before you make it."** — outcome-led, addresses the #1 emotional fear (wasting time), has a clear pre-shop frame.
2. *"Niche research, beautifully done."* — position-led, echoes Creative Fabrica's "beautifully made" register.
3. *"What should you sell on Etsy?"* — keyword-direct, lower brand-strength ceiling.

Ship #1. Use #3 as the H1 on `/beginners` for SEO.

### Quiz (/quiz/[step])

Single column, centered, one question screen at a time. Smooth transitions. Progress dots at top.

```
[Top: 5 progress dots, current one filled brass, others hairline-bordered]

[Question container, max-width 680, padded]

  [Headline — Fraunces, italic on emphasis word, 40–56px]
  What's the *dream* here?
  
  [Sub — body, ink-muted]
  Pick the one closest to true.
  
  [Options — depends on type]
    Single-select tiles:    2x2 grid on desktop, 1-col on mobile, image 
                            + text, click to select, brass border on selected
    Multi-select:           checkbox list, grouped with section headings
    Image multi-select:     3x4 grid of image tiles, max-2 selection

[Bottom row]
  Left:   ← Back (ghost button, only after Q1)
  Right:  Continue → (primary button, brass, only enabled when valid)
```

### Loading (/analyzing)

Full viewport, contemplative.

```
[Vertical center]

  [Subtle SVG animation — three squares rotating in a circle, soft brass strokes]
  
  [Cycle text, italic Fraunces, 24px]
  Matching your skills to 184 Etsy niches…
  Cross-referencing real-time listing data…
  Filtering by your time and budget…
  Finalizing your top three…

  [Progress bar — antique brass, 320px wide, 3px tall, fills 0→100% over 7s]

[No nav, no footer. The user is in the moment.]
```

### Results (/results)

Hero summary, then the three cards, then secondary actions.

```
[Top section, max-width 980, centered]

  [Tiny label]
  YOUR PERSONALIZED RESULTS
  
  [Headline, Fraunces, italic on emphasis]
  Here are *your* three niches.
  
  [Sub, body, ink-muted, max-width 640]
  Matched to your skills, time, budget, and taste. Each one scored 
  on real Etsy data. Click "How we scored this" for the methodology.

  [Share row, small ghost buttons]
  Share on Pinterest · Twitter · Copy link

[CARDS — vertical stack, 1180 max, 32px gap]

EACH CARD (full-width, 48px padding):
  
  [Top row]
    Left:    Card number "01" in tabular Inter, brass, weight 500
    Right:   ConfidencePill — "high confidence" or "medium — Pinterest 
             data unavailable" — small pill, sage or clay background
  
  [Niche name, Fraunces, 28px]
  Boho Wedding Stationery
  
  [Score row]
    Big number — 87 (Inter, weight 500, 48px, sage)
    Label — / 100 (ink-muted, 24px)
  
  [Why this fits you, italic body, max-width 640, 90–120 words]
  Because you've got 5–15 hours a week and you're comfortable in 
  Canva, this is digital-only — design once, sell forever. The 
  modern minimalist + boho overlap maps to a sub-niche where Etsy 
  currently has 12,400 listings (mid-density), and Pinterest's 
  "boho wedding invitation" pin volume grew 38% over the last 12 
  months. Top sellers in the space carry 200+ reviews and listings 
  averaging $24, which is in your "side income" target.
  
  [Score bars — three in a row, animated fill]
    DEMAND          [████████░░] 21/25
    COMPETITION     [██████░░░░] 14/20
    MARGIN          [█████████░] 18/20
  [Expand: see all 8 sub-scores ↓]
  
  [Divider — hairline]
  
  [Two-column row on desktop, stack on mobile]
  
    LEFT:
    [Label] STARTUP COST
    [Body]  $80–150 (Canva Pro + initial listings)
    
    [Label] TIME TO FIRST SALE
    [Body]  2–4 weeks with consistent uploads
    
    RIGHT:
    [Label] FIVE PRODUCT IDEAS
    [Numbered list, body, line-spaced]
    1. Editable boho save-the-date templates
    2. Modular invitation suites with 4 fonts
    3. Boho-meets-minimalist table number printables
    4. Welcome sign mockups (printable + Canva editable)
    5. Bridesmaid proposal cards in 3 color palettes
  
  [Divider — hairline]
  
  [How we scored this — disclosure, ghost button]
  ↓ How we scored this
  
  [Expanded panel — opens inline]
  [Small grid of all 8 sub-scores with one-line explanations]
  [Note]
  Demand and competition are grounded in live Etsy data. Margin and 
  seasonality are modeled from category averages and Etsy's 2026 fee 
  stack. Whitespace bonus is reasoned by Claude based on your aesthetic.
  
  [Bottom CTA row]
    Primary:  Find designs for this niche → (brass, links to 
              creativefabrica.com/search?q={searchQuery})
    Ghost:    Save this niche (writes to localStorage)

[BELOW ALL CARDS]

[Email capture section if not already collected — centered, 80vh padding]

  [Headline, Fraunces, italic]
  Want fresh niches every month?

  [Body, ink-muted, max-width 540]
  We pull new trend data monthly and send the three most promising 
  niches we find. One email. No spam.
  
  [Email input + button, inline]
  [your@email] [Subscribe →]
  
  [Tiny privacy note]
  No spam. Unsubscribe anytime.

[FOOTER]
```

### Methodology (/methodology)

Long-form, transparency-first, also a high-value SEO target ("how to find profitable etsy niches").

Sections: How we score (the 8 components with their inputs), Where the data comes from (Firecrawl + curated catalog + Claude), What we don't claim (no fake "8M listings"), Limitations (Pinterest data is leading-indicator, not real Etsy sales). Plain prose, single column, max-width 680. Hairline dividers between sections.

### About (/about)

One paragraph: who built this, why it's free, the one-line hint about Creative Fabrica without pretending to be official. Link to korneel.dev. Footer says *"Built in Barcelona by Korneel Kennes."*

### Footer

```
[Two columns]

LEFT:
  [Wordmark — nichefinder, Fraunces italic]
  See what sells before you make it.
  
  [Links, body small, ink-muted]
  Methodology · About · Privacy

RIGHT:
  [Built by line]
  Built by Korneel Kennes
  
  [Links]
  korneel.dev · LinkedIn · Twitter

[Bottom hairline divider]

[Tiny line, centered, ink-muted]
© 2026. Not affiliated with or endorsed by Etsy or Creative Fabrica. 
Etsy is a trademark of Etsy, Inc.
```

The disclaimer is non-optional — it's the standard form Etsy requires for tools that mention them.

---

## 11. BUILD ORDER FOR CLAUDE CODE

Sequential phases. At each phase boundary, run the app, verify, commit.

### PHASE 1 — Foundation (60 min)

Prompt for Claude Code:

> *Set up a new Next.js 15 app with App Router, TypeScript, Tailwind v4. Configure custom Tailwind theme with the palette from section 9 of `BUILD_SPEC.md`. Add Fraunces and Inter via `next/font/google`. Create base layout, global CSS with custom properties, and a `/styleguide` route showing every primitive. Install dependencies: `@anthropic-ai/sdk`, `@mendable/firecrawl-js`, `framer-motion`, `react-hook-form`, `zod`, `lucide-react`. Configure Vercel KV. Add `.env.example` with `ANTHROPIC_API_KEY`, `FIRECRAWL_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`.*

Deliverables: blank Next.js app, design tokens wired, fonts loaded, `/styleguide` shows palette and type scale, builds locally.

### PHASE 2 — Design system primitives (60 min)

> *Build the components in section 9.7 of `BUILD_SPEC.md` (Button, Card, Tile, ScoreBar, CycleText, Pill, Expand, EmailInput, ShareRow, ProgressDots). Each goes in `/components/ui` or `/components/quiz` or `/components/results`. Render every variant of every component on `/styleguide`. Use the motion principles from section 9.6 — default ease and duration as CSS variables.*

### PHASE 3 — Static pages with mock data (3 hours)

> *Build the landing, quiz (5 step routes), loading, and results pages from section 10. Use mock data — do not connect Claude or Firecrawl yet. Quiz state lives in URL search params. Results page reads from a hardcoded `mockNiches` import. Loading page runs a 7-second progress and redirects. Use Framer Motion only for the loading-text cycle and quiz transitions; everything else CSS.*

Deliverables: all visual surfaces work end-to-end with mock data. The app *feels* done. This is the moment to take screenshots.

### PHASE 4 — Static niche catalog (60 min)

> *Generate `/data/niches.json` with 150 entries matching the schema in section 7 of `BUILD_SPEC.md`. Use Claude (in chat) to draft an initial 200-niche list across the 12 core Etsy categories: digital, paper goods, jewelry, home decor, wedding, kids/nursery, pets, fashion, art, planners, fonts, crafts. Trim to the 150 strongest. Each entry must include all required fields. Validate the JSON with a Zod schema in `/lib/catalog.ts`.*

### PHASE 5 — Firecrawl integration (60 min)

> *Build `/lib/firecrawl.ts` per section 7. Implement `scrapeEtsySearch(query)` with KV caching at 24h TTL. Build `/lib/candidates.ts` with `filterCandidates(profile, catalog)` that returns the top 8 candidates given a seller profile. Build `/api/test-firecrawl/route.ts` (dev-only) that runs a sample query and returns the parsed result. Verify Firecrawl's structured `extract` returns valid JSON for a real Etsy search page.*

### PHASE 6 — Claude integration (90 min)

> *Build `/lib/claude.ts` with `generateNiches(profile, candidates)`. System prompt and user prompt template per section 8 of `BUILD_SPEC.md`. Use `claude-sonnet-4-5`, max_tokens 2500, temperature 0.4. Enable prompt caching on the system prompt. Build `/api/generate-niches/route.ts` that orchestrates: filter candidates → Firecrawl in parallel → call Claude → validate JSON output → return. Handle Firecrawl failures gracefully (pass `signal_unavailable: true`). Handle Claude JSON parsing failures with a single retry. Connect the quiz → loading → results flow to use the real API.*

### PHASE 7 — SEO pages and polish (60 min)

> *Build `/beginners`, `/trending`, `/low-competition`, `/digital-products`, `/methodology`, `/about`, `/privacy`. The first four pre-fill quiz state and link to `/quiz/1`. Methodology is long-form prose per section 10.5. Add metadata (title, description, OG image) to every page. Build a single OG image template (Fraunces headline + brass accent, 1200×630). Generate `/sitemap.xml` and `/robots.txt`. Verify Lighthouse 95+ on `/` and `/results`.*

### PHASE 8 — Email capture (30 min)

> *Set up Resend (free tier). Build `/api/save-email/route.ts` with Zod validation and a basic anti-spam check (rate limit by IP, 3/hr). Connect the EmailInput component on the email gate page and the results page footer. Send a confirmation email with a static welcome template. Store emails in a Resend audience or Vercel KV list.*

### PHASE 9 — Launch prep (30 min)

> *Final Vercel deploy. Connect custom domain (nichefinder.io or chosen alternative). Test the live URL on a real phone. Run a full quiz flow end-to-end and verify: Firecrawl scrapes complete, Claude returns valid JSON, all 3 cards render, share links work, email capture fires. Submit to Google Search Console. Set Vercel env vars, including budget cap alerts.*

Total: ~9 hours. Bias toward shipping over completing every detail. **Phases 1–6 are non-negotiable. Phases 7–9 are the polish that distinguishes the demo from a prototype.**

---

## 12. SEO & PROGRAMMATIC PAGES

For the MVP, ship four SEO landing pages, each pre-filling quiz state and linking into the main flow:

| Slug | Target keyword | Pre-fill |
|---|---|---|
| `/beginners` | "etsy ideas for beginners" (~2,500/mo) | Q1=passion, Q2=1–5h, Q3=under-100 |
| `/trending` | "trending etsy niches 2026" (~1,500/mo) | none — adds a small live-trends widget |
| `/low-competition` | "low competition etsy niches" (~1,000/mo) | scoring biased toward whitespace |
| `/digital-products` | "best digital products to sell on etsy" (~3,000/mo) | Q4=digital, Q3=under-100 |

Each page reuses the landing hero with a swapped headline and a one-paragraph intro. The CTA goes to `/quiz/1` with the pre-fill in URL params. **Avoid the trap of building 20 SEO pages for the MVP** — four well-built pages outrank twenty thin ones.

---

## 13. POST-LAUNCH DISTRIBUTION

### Day-of launch checklist

1. **Twitter/X post** with a 30-second screen recording of the full flow. Caption: *"Just shipped nichefinder.io — a free AI tool that finds your Etsy niche. Built in days with Claude + Firecrawl. No signup."* Tag Anthropic, Firecrawl, Vercel.

2. **Reddit** — post in r/Etsy and r/EtsySellers with the headline *"I built a free niche finder for Etsy — would love feedback."* Read each sub's rules first. Don't post in more than two subs in the same week.

3. **Pinterest** — create five pinnable result-card screenshots, each pinned to a different niche-themed board. Long-tail keywords in each pin description. This is the highest-leverage channel for this audience.

4. **Product Hunt** — schedule for a Tuesday or Wednesday. Don't pay for placement.

5. **Hacker News Show HN** — only if the build story is interesting (Claude + Firecrawl synthesis, the labor illusion design, the legal/data posture). Frame it as the engineering, not the product.

### Metrics to watch

```
Pageviews                Vercel Analytics
Quiz start rate          % of landing visitors who hit /quiz/1
Quiz completion rate     target 55%+ (industry baseline ~40% for 8-q quizzes)
Email signup rate        target 8%+ of completions
Click-through to CF      most important metric for the pitch
Claude spend             cap at $50, alert at $30
Firecrawl spend          cap at $25, alert at $15
```

---

## 14. CREATIVE FABRICA PITCH

### The email

**Subject:** I built a satellite app for the Vibe Coder role

**Body:**

```
Hi Creative Fabrica team,

I'm Korneel, applying for the Vibe Coder — Satellite Apps Marketer role.

Instead of a cover letter, I built a satellite-app prototype this week:
nichefinder.io — a free AI tool that helps aspiring Etsy sellers discover 
which niche to enter, with real listing data and Claude reasoning.

The thinking:
— SEO target: "what to sell on etsy" (~40k searches/month) and four 
  long-tail variants
— White space: every existing tool (Sale Samurai, eRank, EverBee) is 
  retention for sellers who already have shops. The pre-shop researcher 
  is unserved.
— Funnel: niche match → "find designs for this niche" → Creative Fabrica 
  search with pre-filled query
— Built in days with Claude Sonnet 4.5, Firecrawl, Next.js, Vercel
— Honest data posture: Firecrawl scrapes public Etsy listings + Pinterest 
  signals; Claude synthesizes; we don't pretend to have data Etsy doesn't 
  expose. Defensible legal position vs. incumbents.

Three things I'd love to discuss in an interview:
1. The 8-tool roadmap I have for similar Etsy/POD acquisition apps that 
   funnel into All-Access (attached as a one-pager)
2. How I'd structure programmatic SEO at scale on top of this pattern
3. My approach to keeping satellite apps lightweight enough to ship 1–2 
   per week without quality loss

CV attached. Two-minute Loom walkthrough of the tool: [URL]

Available for a call any time this week.

Warmly,
Korneel Kennes
korneel@chamelio.co
+34 603 71 99 15

nichefinder.io · korneel.dev · linkedin.com/in/korneel-kennes
```

### The Loom

90–120 seconds. Show the quiz, the loading animation, the three result cards (with one card expanded to show the methodology). Narrate: *"This is the user flow. Eight questions. Real Etsy data via Firecrawl. Claude does the synthesis. Every result card shows its work. The CTA on every niche links into Creative Fabrica with a pre-filled search."*

End with: *"I built this in [N] days. The point isn't this tool — it's that this is the satellite-app pattern your role describes, performed unprompted."*

### The 8-tool roadmap one-pager (the highest-leverage attachment)

A single PDF with eight satellite-app concepts, each with a target keyword, a one-line conversion thesis, and the CF product it funnels to.

| # | Tool | Target keyword | Funnels to |
|---|---|---|---|
| 1 | NicheFinder (this) | what to sell on etsy | CF marketplace search |
| 2 | Etsy Title & Tag Generator | etsy seo tags | CF Studio for assets |
| 3 | POD Mockup Generator | t-shirt mockup generator | CF graphics + fonts |
| 4 | SVG Cricut Validator | check svg for cricut | CF SVG bundles |
| 5 | Etsy Listing Auditor | etsy listing checker | CF listing photo packs |
| 6 | Font Pairing Tool | font pairing for branding | CF font subscription |
| 7 | Color Palette Extractor | color palette from image | CF graphics matched to palette |
| 8 | AI Trend & Design Generator | trending designs 2026 | CF Spark generation |

Pitch each in two lines: *the search volume + competition + conversion thesis*. Don't elaborate. The point is to show range, not depth.

### The optional power move

Ship one of those eight tools — a free **Etsy Title Generator** — *before* the interview. End-of-flow CTA: *"Make the matching design with Creative Fabrica Studio →"*. That's literally the job, performed unprompted, twice. It is the highest-leverage thing the candidate can do, and most candidates won't.

---

## 15. APPENDIX

### Domain options summary

| Domain | Verdict |
|---|---|
| `etsynichefinder.com` | **Avoid** — Etsy trademark policy violation, real C&D risk |
| `whatosellonetsy.com` | Avoid — same risk |
| **`nichefinder.io`** | **Recommended primary** — clean, brandable, expandable |
| `nichefinder.app` | Backup if .io taken |
| `findyourniche.com` | Backup — emotional, longer |
| `whattosell.shop` | Alt — direct, .shop reads on-theme |
| `nicherank.app` | Alt — too close to eRank |

Register with Cloudflare. Wildcard SSL, DDoS protection, fast DNS, no upcharges.

### Edge cases the build needs to handle

- **All Q5 boxes unchecked** — the user has zero stated skills. Force a re-prompt with copy: *"Pick at least one. If you're truly starting fresh, check 'starting from zero — teach me as we go.'"*
- **Q7 zero selections** — same pattern. Aesthetic is required.
- **Q4 = "Not sure yet"** — pass `inventory_model: "exploring"` to Claude. The system prompt has a rule: *if inventory_model is exploring, weight toward digital-only and POD candidates and explain the choice in the why-this-fits-you.*
- **Firecrawl returns empty** for all candidates — fall back to catalog metadata only, mark all niches as `"confidence": "low"`, and add a banner: *"Live Etsy data was unavailable for this session. Recommendations are based on our static catalog. Try again in a few minutes for grounded scoring."*
- **Claude returns malformed JSON** — single retry with `temperature: 0.2`. Then fail with a friendly error and a "try again" button.
- **User refreshes during loading** — the URL has the full quiz state, so re-running is idempotent. Cache hits will keep cost down.
- **Mobile keyboard covering the email field** — scroll the input above the keyboard on focus. Test on iOS Safari.

### Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Etsy blocks Firecrawl IPs | Low | Firecrawl rotates UAs; cache TTLs limit calls; degrade gracefully |
| Claude API outage | Low | Show clear error, offer email signup for retry |
| Cost runaway from viral traffic | Low | Vercel spend alerts; rate-limit by IP (3 quizzes/hour); cap monthly Claude spend |
| Domain dispute | Very low if `nichefinder.io` | Ship without "etsy" in the name; carry the disclaimer |
| Recommendations feel generic | Medium | This is what the 8-q quiz, scoring framework, and Firecrawl grounding all exist to fix. If outputs still feel generic in QA, the lever is more candidate niches in the catalog and more aggressive aesthetic filtering. |
| Hiring manager doesn't try the tool | Medium | The Loom front-loads the proof; the email subject is direct; the URL is in the signature |

### What "done" looks like for the MVP

- Lighthouse 95+ on landing and results.
- Quiz completion rate ≥ 55% in your own testing of 10 friends.
- A real quiz with real inputs returns recommendations that *you* would have given a friend, in 6–8 seconds end-to-end.
- The "How we scored this" expander makes the methodology visible.
- The Creative Fabrica CTA on every result card is live and links correctly.
- The Loom is recorded.
- The pitch email is drafted and ready to send.

When all eight are true: **stop iterating, ship, send the email.** Iteration after launch is post-feedback and infinitely cheaper.

---

## ONE LAST THING

This document is meant to be opinionated. Where the v1 spec was hedged, this one is decisive. That's the point — Claude Code agents and Claude design generation both work much better with a single confident specification than with a list of options. If something feels wrong as you build, override it on the fly. Document the override at the bottom of this file. Don't re-litigate every choice.

The product is the proof of the role. The role is the product. Ship the magazine, not the dashboard.
