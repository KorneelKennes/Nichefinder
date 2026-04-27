import type { Metadata } from "next";
import { Display, Pill } from "@/components/primitives";
import { Nav, Footer } from "@/components/Nav";

export const metadata: Metadata = {
  title: "How we score a niche · NicheFinder",
  description:
    "Every niche is scored on eight components — some grounded in live Etsy data, some modeled, some reasoned by Claude. We tell you which is which.",
};

export default function MethodologyPage() {
  return (
    <>
      <Nav active="methodology" />
      <section className="container-narrow" style={{ paddingTop: 80, paddingBottom: 60 }}>
        <div className="label fade-up">METHODOLOGY</div>
        <Display
          parts={["How we ", { em: "score" }, " a niche."]}
          className="fade-up"
          style={{ fontSize: "clamp(40px, 5vw, 64px)", marginTop: 16, animationDelay: "60ms" }}
        />
        <p
          className="muted fade-up"
          style={{ fontSize: 18, marginTop: 22, maxWidth: 640, animationDelay: "120ms" }}
        >
          Every niche is scored on eight components. Some are grounded in live Google search
          signals, some are modeled from category data, and some are reasoned by Claude. We tell
          you which is which.
        </p>
      </section>

      <section className="container-narrow" style={{ paddingBottom: 80 }}>
        <div className="card" style={{ padding: "clamp(28px, 4vw, 48px)" }}>
          <div className="label">THE 8 COMPONENTS</div>
          <table className="methodology-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Weight</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Demand</td><td className="tabular">25</td><td className="muted"><Pill variant="sage">grounded</Pill></td></tr>
              <tr><td>Competition (inverted)</td><td className="tabular">20</td><td className="muted"><Pill variant="sage">grounded</Pill></td></tr>
              <tr><td>Margin economics</td><td className="tabular">20</td><td className="muted"><Pill variant="brass">modeled</Pill></td></tr>
              <tr><td>Repeat / LTV</td><td className="tabular">10</td><td className="muted"><Pill variant="brass">modeled</Pill></td></tr>
              <tr><td>Seasonality</td><td className="tabular">10</td><td className="muted"><Pill variant="brass">modeled</Pill></td></tr>
              <tr><td>Ad cost recovery</td><td className="tabular">10</td><td className="muted"><Pill variant="brass">modeled</Pill></td></tr>
              <tr><td>Policy risk penalty</td><td className="tabular">−15</td><td className="muted"><Pill variant="clay">reasoned</Pill></td></tr>
              <tr><td>Whitespace bonus</td><td className="tabular">+15</td><td className="muted"><Pill variant="clay">reasoned</Pill></td></tr>
            </tbody>
          </table>

          <div style={{ marginTop: 36 }}>
            <div className="label" style={{ marginBottom: 10 }}>DECISION THRESHOLDS</div>
            <div className="threshold-grid">
              <div>
                <span className="display tabular" style={{ fontSize: 32, color: "var(--sage)" }}>80–100</span>
                <div className="muted">High confidence — enter</div>
              </div>
              <div>
                <span className="display tabular" style={{ fontSize: 32, color: "var(--brass)" }}>60–79</span>
                <div className="muted">Viable with differentiation</div>
              </div>
              <div>
                <span className="display tabular" style={{ fontSize: 32, color: "var(--clay)" }}>40–59</span>
                <div className="muted">Risky — unique angle only</div>
              </div>
              <div>
                <span className="display tabular" style={{ fontSize: 32, color: "var(--terracotta)" }}>&lt; 40</span>
                <div className="muted">Avoid for now</div>
              </div>
            </div>
          </div>

          <hr className="hair" style={{ margin: "40px 0" }} />

          <div className="label">WHAT WE DON&apos;T CLAIM</div>
          <p style={{ fontSize: 17, marginTop: 12, lineHeight: 1.65 }}>
            We do not claim to have analyzed every Etsy listing. We do not have private sales data.
            Etsy actively blocks third-party scrapers, so our live signal is Google search
            presence — how many top results for a niche query land on Etsy, and the buyer language
            those results use. Margin and seasonality are modeled from category averages and the
            2026 Etsy fee stack. Whitespace and fit are reasoned by Claude across your profile and
            the catalog. When a signal is missing for a candidate, we surface that confidence
            reduction on the card.
          </p>
        </div>
      </section>
      <Footer />
    </>
  );
}
