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
