"use client";

import { useState } from "react";
import { Pill, Expand, ScoreBar, ScoreRing, ScoreDotsViz, Display } from "@/components/primitives";
import { SCORE_LABELS } from "@/data/quiz";
import type { ResultNiche } from "@/lib/types";
import { cfMeta } from "@/lib/share";

type Viz = "bar" | "ring" | "dots";

export function ScoreViz({
  value,
  max,
  color,
  viz,
  animate,
  delay = 0,
}: {
  value: number;
  max: number;
  color: string;
  viz: Viz;
  animate?: boolean;
  delay?: number;
}) {
  if (viz === "ring") {
    return (
      <ScoreRing
        value={value}
        max={max}
        size={48}
        stroke={4}
        color={
          color === "sage"
            ? "var(--sage)"
            : color === "clay"
              ? "var(--clay)"
              : color === "brass"
                ? "var(--brass)"
                : "var(--terracotta)"
        }
      />
    );
  }
  if (viz === "dots") {
    return <ScoreDotsViz value={value} max={max} color={color} />;
  }
  return <ScoreBar value={value} max={max} color={color} animate={animate} delay={delay} />;
}

export function colorFor(value: number, max: number): string {
  const pct = value / max;
  if (pct >= 0.75) return "sage";
  if (pct >= 0.5) return "brass";
  if (pct >= 0.3) return "clay";
  return "terracotta";
}

export function HeroNicheCard({
  n,
  viz,
  defaultExpanded = false,
}: {
  n: ResultNiche;
  viz: Viz;
  defaultExpanded?: boolean;
}) {
  const subOrder = ["demand", "competition", "margin"] as const;
  const cf = cfMeta(n);

  return (
    <article className="card niche-hero">
      <div className="niche-hero-grid">
        <div className="niche-hero-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={n.hero_img} alt="" />
          <div className="niche-hero-rank">
            <span className="label" style={{ color: "#F7F2E8", letterSpacing: "0.18em" }}>
              RANK
            </span>
            <div className="display tabular" style={{ fontSize: 60, color: "#F7F2E8", lineHeight: 1, marginTop: 2 }}>
              0{n.rank}
            </div>
          </div>
          <div className="niche-hero-tags">
            {n.tags.map((t) => (
              <span key={t} className="hero-tag">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="niche-hero-content">
          <div className="between" style={{ marginBottom: 16 }}>
            <Pill variant={n.confidence === "high" ? "sage" : "clay"}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: 10 }} />
              {n.confidence} confidence
            </Pill>
            <div className="muted tabular" style={{ fontSize: 12 }}>
              {n.taxonomy.join(" · ")}
            </div>
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: 36,
              margin: "0 0 22px",
              letterSpacing: "-0.01em",
            }}
          >
            {n.name}
          </h2>

          <div className="flex" style={{ alignItems: "baseline", gap: 10, marginBottom: 28 }}>
            <span className="display tabular" style={{ fontSize: 64, lineHeight: 1, color: "var(--sage)", fontWeight: 400 }}>
              {n.score}
            </span>
            <span className="muted tabular" style={{ fontSize: 22 }}>
              / 100
            </span>
            <span className="muted" style={{ fontSize: 13, marginLeft: 14 }}>
              match score
            </span>
          </div>

          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 18,
              lineHeight: 1.5,
              margin: "0 0 32px",
              color: "var(--ink)",
            }}
          >
            {n.why}
          </p>

          <div className="niche-hero-bars">
            {subOrder.map((k, i) => {
              const meta = SCORE_LABELS[k];
              const v = n.sub_scores[k];
              const c = colorFor(v, meta.max);
              return (
                <div key={k} className="bar-row">
                  <div className="bar-label label" style={{ minWidth: 110 }}>
                    {meta.label}
                  </div>
                  <div style={{ flex: 1 }}>
                    <ScoreViz value={v} max={meta.max} color={c} viz={viz} animate delay={i * 90} />
                  </div>
                  <div className="tabular muted" style={{ fontSize: 13, width: 56, textAlign: "right" }}>
                    {v}/{meta.max}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <hr className="hair" style={{ marginTop: 36 }} />

      <div className="niche-hero-foot">
        <div>
          <div className="label">STARTUP COST</div>
          <div style={{ fontSize: 16, marginTop: 6 }}>{n.startup_cost}</div>
          <div className="label" style={{ marginTop: 22 }}>
            TIME TO FIRST SALE
          </div>
          <div style={{ fontSize: 16, marginTop: 6 }}>{n.time_to_first_sale}</div>

          <div className="label" style={{ marginTop: 22 }}>
            LIVE SEARCH SIGNAL
          </div>
          <ul className="firecrawl-list">
            <li>
              <span className="muted">Etsy SERP presence</span>
              <span className="tabular">{n.firecrawl.total_listings}</span>
            </li>
          </ul>
        </div>

        <div>
          <div className="label">FIVE PRODUCT IDEAS TO START WITH</div>
          <ol className="ideas-list">
            {n.product_ideas.map((p, i) => (
              <li key={i}>
                <span className="tabular" style={{ color: "var(--brass)", fontWeight: 500, marginRight: 12 }}>
                  0{i + 1}
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ol>

          {n.firecrawl.related_searches.length > 0 && (
            <>
              <div className="label" style={{ marginTop: 22 }}>
                RELATED BUYER LANGUAGE
              </div>
              <div className="related-search-tags">
                {n.firecrawl.related_searches.map((s) => (
                  <span key={s} className="related-tag">
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <hr className="hair" style={{ marginTop: 32 }} />

      <div className="methodology-wrap" style={{ padding: "12px clamp(28px, 4vw, 48px) clamp(24px, 3vw, 36px)" }}>
        <Expand label="How we scored this" defaultOpen={defaultExpanded}>
          <div className="methodology-grid">
            {(Object.entries(n.sub_scores) as [keyof typeof SCORE_LABELS, number][]).map(([k, v]) => {
              const meta = SCORE_LABELS[k];
              if (!meta) return null;
              const isPenalty = k === "policy_penalty";
              const isBonus = k === "whitespace_bonus";
              const c = isPenalty ? "terracotta" : isBonus ? "brass" : colorFor(v, meta.max);
              return (
                <div key={k} className="methodology-cell">
                  <div className="between">
                    <div className="label">{meta.label}</div>
                    <div
                      className="tabular"
                      style={{ fontSize: 13, color: isPenalty ? "var(--terracotta)" : "var(--ink)" }}
                    >
                      {isPenalty || isBonus ? (v >= 0 ? "+" : "") + v : `${v}/${meta.max}`}
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <ScoreViz value={Math.abs(v)} max={meta.max} color={c} viz="bar" animate />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 18, fontStyle: "italic" }}>
            Demand and competition are <em>grounded</em> in live Google search signals via Firecrawl
            (Etsy directly bot-blocks scrapers). Margin and seasonality are <em>modeled</em> from
            category averages and Etsy&apos;s 2026 fee stack. Whitespace and fit are <em>reasoned</em>{" "}
            by Claude based on your aesthetic and timeline.
          </p>
        </Expand>
      </div>

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
    </article>
  );
}

export function CompactNicheCard({
  n,
  viz,
  onExpand,
}: {
  n: ResultNiche;
  viz: Viz;
  onExpand: () => void;
}) {
  return (
    <article className="card niche-compact">
      <div className="niche-compact-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={n.hero_img} alt="" />
        <div className="niche-compact-rank">0{n.rank}</div>
      </div>
      <div className="niche-compact-body">
        <div className="between" style={{ marginBottom: 10 }}>
          <Pill variant={n.confidence === "high" ? "sage" : "clay"}>
            {n.confidence} confidence
          </Pill>
          <div className="muted" style={{ fontSize: 12 }}>
            {n.taxonomy[0]}
          </div>
        </div>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, margin: "0 0 12px" }}>
          {n.name}
        </h3>
        <div className="flex" style={{ alignItems: "baseline", gap: 8, marginBottom: 16 }}>
          <span
            className="display tabular"
            style={{
              fontSize: 38,
              lineHeight: 1,
              color: colorFor(n.score, 100) === "sage" ? "var(--sage)" : "var(--brass)",
            }}
          >
            {n.score}
          </span>
          <span className="muted tabular" style={{ fontSize: 16 }}>
            / 100
          </span>
        </div>
        <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.55, margin: "0 0 16px" }}>
          {n.why.split(". ")[0]}.
        </p>

        <div className="niche-compact-bars">
          {(["demand", "competition", "margin"] as const).map((k, i) => {
            const meta = SCORE_LABELS[k];
            const v = n.sub_scores[k];
            const c = colorFor(v, meta.max);
            return (
              <div key={k} className="bar-row" style={{ fontSize: 12 }}>
                <div className="label" style={{ minWidth: 84, fontSize: 11 }}>
                  {meta.label}
                </div>
                <div style={{ flex: 1 }}>
                  <ScoreViz value={v} max={meta.max} color={c} viz={viz} animate delay={i * 80} />
                </div>
                <div className="tabular muted" style={{ fontSize: 12, width: 42, textAlign: "right" }}>
                  {v}/{meta.max}
                </div>
              </div>
            );
          })}
        </div>

        <hr className="hair" style={{ margin: "16px 0" }} />

        <div className="niche-compact-stats">
          <div>
            <div className="label" style={{ fontSize: 10 }}>LISTINGS</div>
            <div className="tabular" style={{ fontSize: 14, marginTop: 2 }}>
              {n.firecrawl.total_listings}
            </div>
          </div>
          <div>
            <div className="label" style={{ fontSize: 10 }}>AVG PRICE</div>
            <div className="tabular" style={{ fontSize: 14, marginTop: 2 }}>
              {n.firecrawl.top_10_avg_price}
            </div>
          </div>
          <div>
            <div className="label" style={{ fontSize: 10 }}>STARTUP</div>
            <div className="tabular" style={{ fontSize: 14, marginTop: 2 }}>
              {n.startup_cost.split(" ")[0]}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={onExpand}
          >
            See full report →
          </button>
          <button className="btn btn-ghost">
            <i className="fa-regular fa-bookmark" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ResultsView({ niches, warning }: { niches: ResultNiche[]; warning?: string }) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const viz: Viz = "bar";
  const [hero, ...rest] = niches;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    setTimeout(() => {
      const el = document.getElementById(`niche-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  if (!hero) return null;

  return (
    <>
      <section className="container" style={{ paddingTop: 60, paddingBottom: 24 }}>
        <div className="label fade-up" style={{ marginBottom: 16 }}>
          YOUR PERSONALIZED RESULTS
        </div>
        <Display
          parts={["Here are ", { em: "your" }, " three niches."]}
          className="fade-up"
          style={{ fontSize: "clamp(40px, 5.6vw, 72px)", animationDelay: "60ms" }}
        />
        <p
          className="muted fade-up"
          style={{ fontSize: 18, maxWidth: 640, marginTop: 18, animationDelay: "120ms" }}
        >
          Matched to your skills, time, budget, and taste. Each one scored on real Etsy data. Click{" "}
          <em>&quot;How we scored this&quot;</em> on any card for the methodology.
        </p>

        {warning && (
          <div className="error-banner fade-up" style={{ marginTop: 20, animationDelay: "150ms" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 10 }} />
            {warning}
          </div>
        )}
      </section>

      <section className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div className="fade-up" style={{ animationDelay: "240ms" }} id={`niche-${hero.id}`}>
          <HeroNicheCard n={hero} viz={viz} />
        </div>
        {rest.length > 0 && (
          <div className="results-row fade-up" style={{ animationDelay: "320ms" }}>
            {rest.map((n) =>
              expandedIds[n.id] ? (
                <div key={n.id} id={`niche-${n.id}`} style={{ gridColumn: "1 / -1" }}>
                  <HeroNicheCard n={n} viz={viz} defaultExpanded />
                  <div style={{ textAlign: "center", marginTop: 14 }}>
                    <button className="btn btn-ghost" onClick={() => toggleExpand(n.id)}>
                      ↑ Collapse to summary
                    </button>
                  </div>
                </div>
              ) : (
                <CompactNicheCard
                  key={n.id}
                  n={n}
                  viz={viz}
                  onExpand={() => toggleExpand(n.id)}
                />
              )
            )}
          </div>
        )}
      </section>
    </>
  );
}
