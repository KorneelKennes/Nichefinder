"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Nav, Footer } from "@/components/Nav";
import { ResultsView } from "@/components/NicheCards";
import { Display } from "@/components/primitives";
import { getStoredAnswers, getStoredResults } from "@/lib/quiz-state";
import type { GenerateResponse } from "@/lib/types";

function EmailCaptureSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    // MVP stub — real wiring happens in spec § 11 phase 8 (Resend).
    setSubmitted(true);
  };

  return (
    <section
      className="container"
      style={{ paddingTop: "clamp(60px, 8vw, 110px)", paddingBottom: "clamp(60px, 8vw, 110px)" }}
    >
      <div className="email-capture">
        <Display
          parts={["Want fresh niches every ", { em: "month" }, "?"]}
          style={{ fontSize: "clamp(32px, 4.4vw, 48px)" }}
        />
        <p className="muted" style={{ maxWidth: 540, margin: "18px auto 28px", fontSize: 16 }}>
          We pull new trend data monthly and send the three most promising niches we find. One
          email. No spam.
        </p>
        {submitted ? (
          <div
            className="muted"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 19,
              color: "var(--brass)",
            }}
          >
            Thanks — we&apos;ll be in touch when the next batch drops.
          </div>
        ) : (
          <form className="email-row" onSubmit={onSubmit}>
            <input
              className="text-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn btn-primary" type="submit">
              Subscribe →
            </button>
          </form>
        )}
        <div className="muted" style={{ fontSize: 12, marginTop: 14 }}>
          No spam. Unsubscribe anytime.
        </div>
      </div>
    </section>
  );
}

const Q_LABELS: Record<string, string> = {
  digital: "Digital downloads",
  pod: "Print-on-demand",
  made: "Made-to-order",
  stock: "Physical inventory",
  unsure: "Open to suggestions",
  "1-5": "1–5 hrs/week",
  "5-15": "5–15 hrs/week",
  "15-30": "15–30 hrs/week",
  "30+": "30+ hrs/week",
  "under-100": "Under $100 budget",
  "100-500": "$100–500 budget",
  "500-2000": "$500–2,000 budget",
  "2000+": "$2,000+ budget",
};

export function ResultsClient() {
  const router = useRouter();
  const [data, setData] = useState<GenerateResponse | null>(null);
  const [profileSummary, setProfileSummary] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const results = getStoredResults();
    if (!results) {
      router.replace("/");
      return;
    }
    setData(results);

    const a = getStoredAnswers();
    if (a) {
      setProfileSummary([
        Q_LABELS[a.q4] ?? a.q4,
        Q_LABELS[a.q2] ?? a.q2,
        Q_LABELS[a.q3] ?? a.q3,
        a.q7.map((v) => v.charAt(0).toUpperCase() + v.slice(1)).join(" + "),
      ]);
    }

    setHydrated(true);
  }, [router]);

  if (!hydrated || !data) {
    return (
      <>
        <Nav active="results" />
        <section className="container" style={{ paddingTop: 80 }}>
          <Display parts={["Loading your ", { em: "results" }, "…"]} style={{ fontSize: "clamp(32px, 4vw, 48px)" }} />
        </section>
      </>
    );
  }

  return (
    <>
      <Nav active="results" />
      <ResultsView niches={data.niches} warning={data.warning} />

      {profileSummary.length > 0 && (
        <section className="container" style={{ paddingBottom: 40 }}>
          <div className="results-meta fade-up">
            <div className="results-meta-item">
              <i className="fa-solid fa-cloud-arrow-down" style={{ color: "var(--brass)" }} />
              <span>{profileSummary[0]}</span>
            </div>
            <div className="results-meta-item">
              <i className="fa-solid fa-clock" style={{ color: "var(--brass)" }} />
              <span>{profileSummary[1]}</span>
            </div>
            <div className="results-meta-item">
              <i className="fa-solid fa-dollar-sign" style={{ color: "var(--brass)" }} />
              <span>{profileSummary[2]}</span>
            </div>
            <div className="results-meta-item">
              <i className="fa-solid fa-palette" style={{ color: "var(--brass)" }} />
              <span>{profileSummary[3]}</span>
            </div>
            <Link className="btn btn-ghost" href="/quiz/1" style={{ marginLeft: "auto", fontSize: 13 }}>
              Edit answers →
            </Link>
          </div>
        </section>
      )}

      <EmailCaptureSection />

      <section className="container" style={{ paddingBottom: 40 }} />

      <Footer />
    </>
  );
}
