# Architecture

## High-level

```mermaid
flowchart LR
  Q[Quiz pages<br/>5 steps · 8 questions] -->|"sessionStorage<br/>(profile)"| A[/analyzing/]
  A -->|"POST /api/generate-niches"| API[Route handler]
  API -->|"filter()"| F[Candidate filter<br/>25-niche static catalog]
  F -->|"top 8 candidates"| FC[Firecrawl search<br/>Google SERP per niche]
  FC -.->|"24h cache"| Cache[(In-memory<br/>TTL cache)]
  FC -->|"signals"| CL[Claude Sonnet 4.6<br/>+ prompt caching]
  CL -->|"top 3 + scores"| Z[Zod validation]
  Z -->|"GenerateResponse"| A
  A -->|"sessionStorage<br/>(results)"| R[/results/<br/>1 hero + 2 compact cards]
  R -->|"per-niche cf_query"| CF[Creative Fabrica<br/>search]
```

## Layers

| Layer | Files | Responsibility |
| --- | --- | --- |
| **UI / pages** | `src/app/` | App Router routes — landing, quiz, analyzing loader, results, methodology, beginners. Most pages are server components; interactive surfaces use `"use client"`. |
| **Components** | `src/components/` | Shared primitives (`Display`, `Pill`, `Expand`, `ScoreBar`, `ProgressDots`), nav/footer, the niche cards. |
| **Quiz state** | `src/lib/quiz-state.ts` | Hook + helpers backed by `sessionStorage`, with Zod-validated reads. Stale shapes are auto-evicted. |
| **API route** | `src/app/api/generate-niches/route.ts` | Orchestrator: validate → filter → Firecrawl in parallel → Claude → validate → return. Mock fallback if any upstream is missing. |
| **Domain libs** | `src/lib/{candidates,firecrawl,claude,cache,mock}.ts` | One module per concern. |
| **Schemas + types** | `src/lib/{schemas,types}.ts` | Zod schemas at every API boundary; TS types derived where useful. |
| **Static data** | `src/data/{catalog,quiz}.ts` | 25-niche catalog (each with `hero_img`, `cf_query`, scoring metadata) + 8-question quiz schema. |

## Data flow on submit

1. **Validate** the seller profile against `sellerProfileSchema` (Zod). String fields are length-capped and regex-restricted to prevent prompt-injection through quiz answers.
2. **Pre-rank candidates** by code (`filterCandidates()`): hard-fail on inventory model mismatch / missing required equipment / no skills overlap; score the rest by aesthetic overlap, time, budget, timeline, and policy risk; return the top 8.
3. **Firecrawl** in parallel for the top 8. We pivoted from direct Etsy scraping (Etsy bot-blocks even stealth proxies) to Firecrawl's `search()` endpoint, which hits Google. From the SERP we measure Etsy's competitive presence ("X / 20 top results on Etsy") and synthesize buyer-language phrases via n-gram analysis of result titles.
4. **Claude Sonnet 4.6** with the system prompt from `src/lib/claude.ts` — the 8-component scoring framework, hard rules, voice guide, and JSON-only output requirement. System prompt is cached via `cache_control: ephemeral` for ~40% input-token savings on subsequent calls. Single retry at lower temperature on JSON parse failure.
5. **Validate** Claude's output against `claudeResponseSchema`; bounds are intentionally permissive (model deviates ±1 on counts) and the orchestrator slices to the top 3.
6. **Enrich + return** — each result niche carries the catalog's hero image, the per-niche Creative Fabrica search query, the inventory tag, and the live Firecrawl signal (or `signal_unavailable: true` so the UI can degrade honestly).

## Resilience

- **Missing API keys** → returns curated mock data with a warning banner. UI works for development without keys.
- **Firecrawl fails** for a candidate → that candidate goes to Claude with `signal_unavailable: true`; Claude marks it `medium`/`low` confidence and the UI shows that.
- **Claude returns malformed JSON** → one retry at temperature 0.2, then mock fallback with a "synthesis failed" warning.
- **Stale `sessionStorage` shape** (e.g. user has results from a previous schema version) → `safeParse` evicts and redirects, no crash.
- **React strict-mode double-mount** on the analyzing loader → no rAF cleanup; the chain naturally exits via the route navigation.

## Why these choices

- **No database, no auth.** Quiz state lives in `sessionStorage` so refresh/share works without backend. Scope limit per spec § 2.
- **Custom CSS over Tailwind.** Design tokens (palette, typography, spacing) come from spec § 9 and map cleanly to CSS custom properties. No utility-class bloat for a single-app MVP.
- **In-memory cache.** Per spec § 7 a 24h TTL is plenty. Vercel KV is the production swap (drop-in for `cache.ts`).
- **Mermaid diagrams.** GitHub renders them natively, so the architecture stays readable without external tooling.

## Roadmap (to leave MVP territory)

| Phase | Item | Why |
| --- | --- | --- |
| Soon | Catalog 25 → 150 niches | Spec § 7. Curation is the durable IP. |
| Soon | Vercel KV swap | Cold-start cache misses cost money once traffic exists. |
| Soon | Resend wiring on email capture | Currently a stub; spec § 11 phase 8. |
| Maybe | Residential-proxy upgrade for Firecrawl | Restores direct Etsy listing data (avg price / reviews / shop age) the spec originally called for. |
| Maybe | OG-image generator per result | Pinterest-pinnable cards are the single highest-leverage distribution channel for this audience. |
| Future | `/trending` `/low-competition` `/digital-products` SEO landing variants | Per spec § 12 — pre-fill quiz state via URL. |
