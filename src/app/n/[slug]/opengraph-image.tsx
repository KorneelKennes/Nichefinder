import { ImageResponse } from "next/og";
import { NICHE_CATALOG } from "@/data/catalog";
import { NICHE_CONTENT } from "@/data/niche-content";

export const runtime = "edge";
export const alt = "NicheFinder — niche guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Match the design tokens in src/app/globals.css :root.
const CREAM = "#F7F2E8";   // --bg
const INK = "#2A201A";     // --ink
const BRASS = "#B8893A";   // --brass
const MUTED = "#6B6660";   // --ink-muted

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const niche = NICHE_CATALOG.find((n) => n.id === slug);
  const content = NICHE_CONTENT[slug];
  if (!niche || !content) {
    return new Response("Not found", { status: 404 });
  }

  const fraunces = await fetch(new URL("./Fraunces-Italic.ttf", import.meta.url)).then((r) => r.arrayBuffer());
  const inter = await fetch(new URL("./Inter-Medium.ttf", import.meta.url)).then((r) => r.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: CREAM,
        }}
      >
        {/* Left half — hero photo */}
        <div style={{ width: 600, height: 630, display: "flex", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={niche.hero_img}
            alt=""
            width={600}
            height={630}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Right half — text */}
        <div
          style={{
            width: 600,
            height: 630,
            padding: "56px 56px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            color: INK,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: "Inter",
                fontSize: 16,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: 18,
              }}
            >
              {niche.etsy_taxonomy[0]}
            </div>
            <div
              style={{
                fontFamily: "Fraunces",
                fontStyle: "italic",
                fontSize: 64,
                lineHeight: 1.05,
                color: INK,
                letterSpacing: "-0.01em",
              }}
            >
              {niche.name}
            </div>
            <div
              style={{
                fontFamily: "Inter",
                fontSize: 22,
                lineHeight: 1.4,
                color: MUTED,
                marginTop: 22,
              }}
            >
              {content.pin_tagline}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                fontFamily: "Fraunces",
                fontStyle: "italic",
                fontSize: 26,
                color: BRASS,
              }}
            >
              nichefinder
            </div>
            <div
              style={{
                fontFamily: "Inter",
                fontSize: 14,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: MUTED,
              }}
            >
              See what sells before you make it
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, style: "italic", weight: 500 },
        { name: "Inter", data: inter, style: "normal", weight: 500 },
      ],
    }
  );
}
