/**
 * Shared social-link + Creative Fabrica helpers used by the result cards
 * and the per-niche guide pages. Lifted from NicheCards.tsx so both
 * surfaces share one source of truth.
 */

import type { InventoryModel } from "@/lib/types";

// Server-side fallback when NEXT_PUBLIC_SITE_URL is unset. Use the production
// origin (matches src/app/sitemap.ts and src/app/layout.tsx metadataBase) so
// builds without the env var still emit valid canonicals/og:url. Local dev
// can override via .env.local; the .env.example placeholder is localhost.
const FALLBACK_ORIGIN = "https://nichefinder.io";

function siteOrigin(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_ORIGIN;
}

export function nichePageUrl(slug: string): string {
  return `${siteOrigin()}/n/${slug}`;
}

export function pinterestImageUrl(slug: string): string {
  return `${siteOrigin()}/n/${slug}/pinterest-image`;
}

/**
 * Pinterest's official "Pin It" endpoint. Pre-fills the pin creation
 * dialog with our page URL, our pin image URL, and a description.
 * Docs: https://developers.pinterest.com/docs/web-features/save/
 */
export function pinterestShareUrl(args: {
  slug: string;
  description: string;
}): string {
  const params = new URLSearchParams({
    url: nichePageUrl(args.slug),
    media: pinterestImageUrl(args.slug),
    description: args.description,
  });
  return `https://pinterest.com/pin/create/button/?${params.toString()}`;
}

export function buildShareUrls(args: {
  slug: string;
  shareDescription: string;
}): {
  pageUrl: string;
  pinterestUrl: string;
} {
  return {
    pageUrl: nichePageUrl(args.slug),
    pinterestUrl: pinterestShareUrl({
      slug: args.slug,
      description: args.shareDescription,
    }),
  };
}

/**
 * Copy a string to the clipboard. Returns true on success, false if the
 * Clipboard API is unavailable or denied.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creative Fabrica search button label + URL for a niche. The label is
 * conditional on inventory model so it reads honestly:
 *   - pod          → "Find graphics for your designs"
 *   - made / stock → "Find fonts & mockups for your shop"
 *   - digital / unsure / unknown → "Find templates to remix"
 *
 * Accepts either a ResultNiche (single inventory_model) or a CatalogNiche
 * (inventory_models array). When both are set, inventory_model wins;
 * when only the array is set, the first entry is used; when neither
 * is set, falls back to the digital/unsure label.
 */
export function cfMeta(niche: {
  name: string;
  cf_query: string;
  inventory_model?: InventoryModel;
  inventory_models?: InventoryModel[];
}): { url: string; label: string; sub: string } {
  const inv = pickInventoryModel(niche);
  const query = niche.cf_query || niche.name;
  let label: string;
  switch (inv) {
    case "pod":
      label = "Find graphics for your designs";
      break;
    case "made":
    case "stock":
      label = "Find fonts & mockups for your shop";
      break;
    case "digital":
    case "unsure":
    default:
      label = "Find templates to remix";
      break;
  }
  return {
    url: `https://www.creativefabrica.com/search/?query=${encodeURIComponent(query)}`,
    label,
    sub: "Creative Fabrica",
  };
}

function pickInventoryModel(niche: {
  inventory_model?: InventoryModel;
  inventory_models?: InventoryModel[];
}): InventoryModel | undefined {
  if (niche.inventory_model) return niche.inventory_model;
  if (niche.inventory_models && niche.inventory_models.length > 0) return niche.inventory_models[0];
  return undefined;
}
