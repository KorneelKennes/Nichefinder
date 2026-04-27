/* Pre-filter the static catalog by inventory model + equipment + skills,
   then rank-pre-score against the seller profile to pick the top 8 candidates. */

import { NICHE_CATALOG } from "@/data/catalog";
import type { CatalogNiche, SellerProfile } from "@/lib/types";

const TIME_WEIGHTS: Record<SellerProfile["q2"], number> = {
  "1-5": 1,
  "5-15": 2,
  "15-30": 3,
  "30+": 4,
};

const BUDGET_WEIGHTS: Record<SellerProfile["q3"], number> = {
  "under-100": 1,
  "100-500": 2,
  "500-2000": 3,
  "2000+": 4,
};

function scoreOne(niche: CatalogNiche, profile: SellerProfile): number {
  let score = 0;

  // Inventory model match
  if (profile.q4 === "unsure") {
    if (niche.inventory_models.includes("digital") || niche.inventory_models.includes("pod")) score += 8;
  } else if (niche.inventory_models.includes(profile.q4)) {
    score += 12;
  } else {
    return -1; // hard fail
  }

  // Skills overlap
  const skillOverlap = niche.required_skills.filter((s) => profile.q5.includes(s)).length;
  if (niche.required_skills.length === 0) {
    score += 4;
  } else if (skillOverlap > 0) {
    score += 6 + skillOverlap * 2;
  } else if (profile.q5.includes("zero")) {
    // Beginner explicitly opting in to learning, small allowance
    score += 2;
  } else {
    return -1;
  }

  // Equipment requirements
  if (niche.required_equipment.length > 0) {
    const owned = profile.q6 ?? [];
    const hasGear = niche.required_equipment.every((e) => owned.includes(e));
    if (!hasGear) return -1;
    score += 4;
  }

  // Aesthetic overlap (heavy weight per spec § 5)
  const aestheticOverlap = niche.aesthetic_clusters.filter((a) => profile.q7.includes(a)).length;
  if (aestheticOverlap > 0) {
    score += aestheticOverlap * 8;
  } else if (niche.aesthetic_clusters.includes("evergreen")) {
    score += 2;
  }

  // Budget / startup-cost match (rough, high-margin digital plays well at low budget)
  const budget = BUDGET_WEIGHTS[profile.q3];
  if (niche.modeled_net_margin_pct >= 0.8 && budget <= 2) score += 4;
  if (niche.inventory_models[0] === "stock" && budget < 3) score -= 4;

  // Time match
  const time = TIME_WEIGHTS[profile.q2];
  const isHandmade = niche.inventory_models.includes("made") && !niche.inventory_models.includes("digital");
  if (isHandmade && time <= 1) score -= 4;
  if (!isHandmade && time >= 2) score += 2;

  // Timeline match (digital = faster)
  if (profile.q8 === "30-days" && niche.inventory_models.includes("digital")) score += 3;
  if (profile.q8 === "30-days" && !niche.inventory_models.includes("digital")) score -= 2;

  // Policy risk light penalty
  score -= niche.policy_risk_flags.length * 3;

  return score;
}

export function filterCandidates(profile: SellerProfile, limit = 8): CatalogNiche[] {
  const scored = NICHE_CATALOG.map((n) => ({ n, s: scoreOne(n, profile) })).filter((x) => x.s > 0);
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.n);
}
