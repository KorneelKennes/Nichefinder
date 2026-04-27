"use client";

import Link from "next/link";

export function Nav({ active }: { active?: string }) {
  return (
    <nav className="nf-nav">
      <Link className="nf-wordmark" href="/">
        <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22 }}>
          nichefinder
        </span>
      </Link>
      <div className="nf-nav-links">
        <Link href="/methodology" className={active === "methodology" ? "active" : ""}>
          Methodology
        </Link>
        <Link href="/beginners" className={active === "beginners" ? "active" : ""}>
          For beginners
        </Link>
        <Link href="/quiz/1" className="btn btn-primary">
          Begin →
        </Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="nf-footer">
      <div className="container">
        <div className="nf-footer-grid">
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, marginBottom: 8 }}>
              nichefinder
            </div>
            <div className="muted" style={{ maxWidth: 320 }}>
              See what sells before you make it.
            </div>
          </div>
          <div className="nf-footer-links">
            <Link href="/methodology">Methodology</Link>
            <Link href="/beginners">For beginners</Link>
            <Link href="/">Home</Link>
          </div>
          <div className="nf-footer-meta muted">
            <div>Built by Korneel Kennes</div>
            <div>Barcelona · 2026</div>
          </div>
        </div>
        <hr className="hair" style={{ margin: "32px 0 18px" }} />
        <div className="muted" style={{ fontSize: 12.5, textAlign: "center" }}>
          © 2026. Not affiliated with or endorsed by Etsy or Creative Fabrica. Etsy is a trademark of Etsy, Inc.
        </div>
      </div>
    </footer>
  );
}
