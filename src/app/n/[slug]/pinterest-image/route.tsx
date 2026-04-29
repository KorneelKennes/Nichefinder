import { ImageResponse } from "next/og";
import { NICHE_CATALOG } from "@/data/catalog";
import { NICHE_CONTENT } from "@/data/niche-content";

export const runtime = "edge";

// Match the design tokens in src/app/globals.css :root.
const CREAM = "#F7F2E8";   // --bg
const INK = "#2A201A";     // --ink
const BRASS = "#B8893A";   // --brass
const MUTED = "#6B6660";   // --ink-muted

const SIZE = { width: 1000, height: 1500 } as const;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const niche = NICHE_CATALOG.find((n) => n.id === slug);
  const content = NICHE_CONTENT[slug];
  if (!niche || !content) {
    return new Response("Not found", { status: 404 });
  }

  // Font files live one directory up (sibling to the route directory).
  const fraunces = await fetch(new URL("../Fraunces-Italic.ttf", import.meta.url)).then((r) => r.arrayBuffer());
  const inter = await fetch(new URL("../Inter-Medium.ttf", import.meta.url)).then((r) => r.arrayBuffer());

  const inventoryShort =
    niche.inventory_models[0] === "digital" ? "Digital" :
    niche.inventory_models[0] === "pod" ? "Print-on-demand" :
    niche.inventory_models[0] === "made" ? "Made-to-order" :
    niche.inventory_models[0] === "stock" ? "Physical" :
    "Mixed";
  const priceLine = `$${niche.typical_price_range[0]}–${niche.typical_price_range[1]} typical`;
  const marginLine = `~${Math.round(niche.modeled_net_margin_pct * 100)}% margin`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: CREAM }}>
        {/* Top ~60% — hero photo with bottom gradient */}
        <div style={{ width: 1000, height: 900, position: "relative", display: "flex", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={niche.hero_img}
            alt=""
            width={1000}
            height={900}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 240,
              background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)",
              display: "flex",
            }}
          />
        </div>

        {/* Middle band — niche name + tagline + stats */}
        <div
          style={{
            width: 1000,
            height: 450,
            padding: "48px 64px 32px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: CREAM,
          }}
        >
          <div
            style={{
              fontFamily: "Fraunces",
              fontStyle: "italic",
              fontSize: 88,
              lineHeight: 1.02,
              letterSpacing: "-0.01em",
              color: INK,
            }}
          >
            {niche.name}
          </div>
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 28,
              lineHeight: 1.35,
              color: MUTED,
              marginTop: 24,
            }}
          >
            {content.pin_tagline}
          </div>
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 24,
              color: INK,
              marginTop: 32,
              display: "flex",
              gap: 22,
              flexWrap: "wrap",
            }}
          >
            <span>{inventoryShort}</span>
            <span style={{ color: MUTED }}>·</span>
            <span>{priceLine}</span>
            <span style={{ color: MUTED }}>·</span>
            <span>{marginLine}</span>
          </div>
        </div>

        {/* Bottom band — wordmark + URL */}
        <div
          style={{
            width: 1000,
            height: 150,
            padding: "0 64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${BRASS}`,
            background: CREAM,
          }}
        >
          <div style={{ fontFamily: "Fraunces", fontStyle: "italic", fontSize: 36, color: BRASS }}>
            nichefinder
          </div>
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 18,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            nichefinder.io
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "Fraunces", data: fraunces, style: "italic", weight: 500 },
        { name: "Inter", data: inter, style: "normal", weight: 500 },
      ],
    }
  );
}
