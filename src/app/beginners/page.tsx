import type { Metadata } from "next";
import Link from "next/link";
import { Display } from "@/components/primitives";
import { Nav, Footer } from "@/components/Nav";

export const metadata: Metadata = {
  title: "What should you sell on Etsy? · For beginners · NicheFinder",
  description:
    "You don't have a shop yet. You have an interest, maybe equipment, definitely no idea what to make first. We help you find out — in 60 seconds.",
};

export default function BeginnersPage() {
  return (
    <>
      <Nav active="beginners" />
      <section
        className="container-narrow"
        style={{ paddingTop: 80, paddingBottom: 40, textAlign: "center" }}
      >
        <div className="label fade-up">FOR BEGINNERS</div>
        <Display
          parts={["What ", { em: "should" }, " you sell on Etsy?"]}
          className="fade-up"
          style={{ fontSize: "clamp(44px, 6vw, 84px)", marginTop: 18, animationDelay: "60ms" }}
        />
        <p
          className="muted fade-up"
          style={{
            fontSize: 19,
            marginTop: 22,
            maxWidth: 580,
            marginLeft: "auto",
            marginRight: "auto",
            fontStyle: "italic",
            fontFamily: "var(--font-display)",
            animationDelay: "120ms",
          }}
        >
          You don&apos;t have a shop yet. You have an interest, maybe equipment, definitely no idea
          what to make first. We help you find out — in 60 seconds.
        </p>
        <Link
          className="btn btn-primary btn-lg fade-up"
          style={{ marginTop: 36, animationDelay: "180ms" }}
          href="/quiz/1"
        >
          Find my niche →
        </Link>
        <div className="muted fade-up" style={{ fontSize: 13, marginTop: 14, animationDelay: "180ms" }}>
          Pre-set for: passion project · 1–5 hrs/week · under $100
        </div>
      </section>

      <section className="container" style={{ paddingTop: 60, paddingBottom: 100 }}>
        <div className="beginners-grid">
          {[
            {
              t: "Start lean",
              d: "Most beginners shouldn't invest more than $100 to test a niche. We bias toward digital-first picks where listing fees are your only real cost.",
            },
            {
              t: "Honest competition data",
              d: "We show you how many listings already exist and whether the top sellers are entrenched — so you don't enter a dead-end.",
            },
            {
              t: "Aesthetic over guesswork",
              d: "Pinterest-native buyers shop by vibe, not category. We weight your aesthetic match heavily and show you the language buyers actually use.",
            },
          ].map((b, i) => (
            <div key={i} className="card" style={{ padding: 32 }}>
              <div className="tabular" style={{ color: "var(--brass)", fontSize: 14, fontWeight: 500 }}>
                0{i + 1}
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, margin: "10px 0" }}>
                {b.t}
              </h3>
              <p className="muted" style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6 }}>
                {b.d}
              </p>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </>
  );
}
