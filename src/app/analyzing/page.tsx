"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CycleText } from "@/components/primitives";
import { LOADING_LINES } from "@/data/quiz";
import { getStoredAnswers, saveResults } from "@/lib/quiz-state";
import type { GenerateResponse } from "@/lib/types";

export default function AnalyzingPage() {
  const router = useRouter();
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [longWait, setLongWait] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const answers = getStoredAnswers();
    if (!answers) {
      router.replace("/quiz/1");
      return;
    }

    const start = performance.now();
    // Loader is intentionally long. Bar fills 0 → 99% smoothly with ease-in-out
    // over BAR_DURATION_MS regardless of how fast the API resolves; we only
    // jump to 100% and navigate once BOTH the bar reaches 99% AND the API
    // has returned. This makes the loader feel consistent across runs.
    const BAR_DURATION_MS = 50_000;
    const HOLD_AT = 0.99;
    let apiDone = false;
    let apiResult: GenerateResponse | null = null;
    let apiError: string | null = null;

    fetch("/api/generate-niches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`api_${res.status}`);
        return (await res.json()) as GenerateResponse;
      })
      .then((data) => {
        apiResult = data;
      })
      .catch((err: Error) => {
        apiError = err.message || "request_failed";
      })
      .finally(() => {
        apiDone = true;
      });

    const tick = (now: number) => {
      const elapsed = now - start;
      // Linear progress 0..1 across the planned duration
      const linear = Math.min(1, elapsed / BAR_DURATION_MS);
      // Ease-in-out cubic: slow start, fast middle, slow end
      const eased =
        linear < 0.5
          ? 4 * linear * linear * linear
          : 1 - Math.pow(-2 * linear + 2, 3) / 2;

      // Cap the visible bar at HOLD_AT until the API actually finishes.
      const target = Math.min(eased, HOLD_AT);
      setPct(target);

      // Long-wait message once we're parked at 99% waiting on the API.
      if (!apiDone && target >= HOLD_AT - 0.001) {
        setLongWait(true);
      }

      // Only navigate once BOTH the bar has reached 99% AND the API has resolved.
      if (apiDone && target >= HOLD_AT - 0.0005) {
        if (apiError) {
          setError(apiError);
          return;
        }
        const result = apiResult;
        if (result) {
          // Snap to 100% one frame before navigating, for a satisfying close.
          setPct(1);
          requestAnimationFrame(() => {
            saveResults(result);
            router.replace("/results");
          });
          return;
        }
      }

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // No cleanup that cancels the rAF — under React strict mode that would
    // kill the chain after the dev double-mount and the page would freeze at
    // 0%. The `cancelled` flag stays false; if the route changes for some
    // other reason, setPct on an unmounted component is a no-op in React 18+.
  }, [router]);

  return (
    <div className="analyzing">
      <div className="analyzing-inner">
        <div className="analyzing-art">
          <svg viewBox="0 0 240 240" width="180" height="180">
            <defs>
              <linearGradient id="brassG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--brass)" stopOpacity="0.9" />
                <stop offset="100%" stopColor="var(--brass-hover)" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <g style={{ transformOrigin: "120px 120px", animation: "nfRotate 14s linear infinite" }}>
              <circle cx="120" cy="120" r="92" fill="none" stroke="var(--hairline-strong)" strokeWidth="1" strokeDasharray="2 6" />
            </g>
            <circle
              cx="120"
              cy="120"
              r="74"
              fill="none"
              stroke="url(#brassG)"
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 74}`}
              strokeDashoffset={`${2 * Math.PI * 74 * (1 - pct)}`}
              transform="rotate(-90 120 120)"
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 220ms linear" }}
            />
            {[
              { x: 76, delay: 0 },
              { x: 110, delay: 0.15 },
              { x: 144, delay: 0.3 },
            ].map((sq, i) => {
              const localPct = Math.max(0, Math.min(1, (pct - sq.delay) * 1.8));
              const size = 12 + localPct * 18;
              const opacity = localPct;
              const y = 120 - size / 2;
              const x = sq.x - size / 2 + 14;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={size}
                  height={size}
                  fill="var(--brass)"
                  opacity={opacity * 0.92}
                  rx="2"
                  style={{ transition: "all 200ms linear" }}
                />
              );
            })}
            <circle
              cx="120"
              cy="120"
              r={Math.max(0, 8 - pct * 16)}
              fill="var(--ink)"
              opacity={Math.max(0, 1 - pct * 2)}
            />
          </svg>
        </div>

        <CycleText lines={LOADING_LINES} interval={1700} />

        <div className="analyzing-bar">
          <div className="analyzing-bar-fill" style={{ width: `${pct * 100}%` }} />
        </div>
        <div className="muted tabular" style={{ fontSize: 12, marginTop: 12, letterSpacing: "0.06em" }}>
          {Math.floor(pct * 100)}%
        </div>

        {longWait && !error && (
          <div
            className="muted"
            style={{
              marginTop: 24,
              fontSize: 14,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
            }}
          >
            Almost there…
          </div>
        )}

        {error && (
          <div className="error-banner" style={{ marginTop: 32 }}>
            Something went wrong while generating your recommendations. Please try again.
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => location.reload()}>
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
