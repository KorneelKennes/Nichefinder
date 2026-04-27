import Link from "next/link";
import { Display } from "@/components/primitives";
import { Nav, Footer } from "@/components/Nav";
import { MOCK_NICHES } from "@/lib/mock";

export default function LandingPage() {
  return (
    <>
      <Nav />

      <section className="nf-hero">
        <div className="container-narrow" style={{ paddingTop: "clamp(60px, 10vw, 120px)", paddingBottom: "clamp(40px, 6vw, 80px)" }}>
          <div className="label fade-up" style={{ textAlign: "center", marginBottom: 28 }}>
            FREE · NO SIGNUP UNTIL THE END · 60 SECONDS
          </div>
          <Display
            parts={["See what ", { em: "sells " }, "before you make it."]}
            className="fade-up"
            style={{ fontSize: "clamp(48px, 7.6vw, 104px)", textAlign: "center", animationDelay: "60ms" }}
          />
          <p
            className="fade-up muted"
            style={{
              textAlign: "center",
              maxWidth: 620,
              margin: "28px auto 0",
              fontSize: 19,
              fontStyle: "italic",
              fontFamily: "var(--font-display)",
              animationDelay: "140ms",
            }}
          >
            Eight questions. Three Etsy niches matched to your time, budget, skills, and taste — grounded in live
            search-demand signals.
          </p>
          <div
            className="fade-up center"
            style={{ marginTop: 44, animationDelay: "220ms", flexDirection: "column", gap: 14 }}
          >
            <Link href="/quiz/1" className="btn btn-primary btn-lg">
              Begin <span style={{ fontSize: 18 }}>→</span>
            </Link>
            <div className="muted" style={{ fontSize: 13 }}>
              Honest signals. Live Google search data. Claude reasoning. No fluff.
            </div>
          </div>
        </div>

        <div className="container fade-up" style={{ animationDelay: "320ms", marginTop: 40 }}>
          <div className="nf-preview-strip">
            {MOCK_NICHES.map((n) => (
              <div key={n.id} className="nf-preview-card">
                <div className="nf-preview-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={n.hero_img} alt="" loading="lazy" />
                  <div className="nf-preview-shade" />
                </div>
                <div className="nf-preview-meta">
                  <div className="label">RANK 0{n.rank}</div>
                  <div className="nf-preview-name">{n.name}</div>
                  <div className="nf-preview-foot">
                    <span className="tabular" style={{ color: "var(--sage)", fontWeight: 600 }}>
                      {n.score}
                    </span>
                    <span className="muted tabular" style={{ fontSize: 13 }}>
                      / 100
                    </span>
                    <span style={{ marginLeft: "auto" }} className="muted tabular">
                      {n.firecrawl.total_listings} listings
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="container"
        style={{ paddingTop: "clamp(80px, 10vw, 140px)", paddingBottom: "clamp(80px, 10vw, 140px)" }}
      >
        <div className="how-it-works-grid">
          <div className="label">HOW IT WORKS</div>
          <div className="nf-steps">
            {[
              { n: "01", t: "Tell us about you", d: "Eight questions, 60 seconds. The questions matter — they're how we avoid generic answers." },
              { n: "02", t: "We measure live demand", d: "We check Google search presence, related buyer language, and competitive density for niches that match your profile." },
              { n: "03", t: "Get three niches with reasoning", d: "Each comes with a score, our methodology, and five product ideas to start with." },
            ].map((s) => (
              <div key={s.n} className="nf-step">
                <div className="tabular" style={{ fontSize: 14, color: "var(--brass)", fontWeight: 500 }}>
                  {s.n}
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, margin: "10px 0 10px" }}>
                  {s.t}
                </h3>
                <p className="muted" style={{ margin: 0, fontSize: 16 }}>
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--bg-2)", borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)" }}>
        <div
          className="container"
          style={{ paddingTop: "clamp(60px, 8vw, 100px)", paddingBottom: "clamp(60px, 8vw, 100px)" }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
            {[
              { n: "184", l: "curated niches" },
              { n: "8", l: "scoring components" },
              { n: "Live", l: "search signals" },
              { n: "0", l: "fake stats" },
            ].map((s, i) => (
              <div key={i}>
                <div className="display tabular" style={{ fontSize: 56, lineHeight: 1, color: "var(--brass)" }}>
                  {s.n}
                </div>
                <div className="label" style={{ marginTop: 10 }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="container"
        style={{
          paddingTop: "clamp(80px, 10vw, 140px)",
          paddingBottom: "clamp(80px, 10vw, 140px)",
          textAlign: "center",
        }}
      >
        <Display parts={["Ready when ", { em: "you" }, " are."]} style={{ fontSize: "clamp(40px, 5.5vw, 64px)" }} />
        <div style={{ marginTop: 32 }}>
          <Link href="/quiz/1" className="btn btn-primary btn-lg">
            Begin →
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
