/* Shared types for the NicheFinder pipeline. */

export type InventoryModel = "digital" | "pod" | "made" | "stock" | "unsure";

export type SellerProfile = {
  q1: "passion" | "side" | "fulltime" | "brand";
  q2: "1-5" | "5-15" | "15-30" | "30+";
  q3: "under-100" | "100-500" | "500-2000" | "2000+";
  q4: InventoryModel;
  q5: string[];
  q6?: string[];
  q7: string[];
  q8: "30-days" | "2-3-months" | "6-12-months" | "exploring";
};

export type CatalogNiche = {
  id: string;
  name: string;
  etsy_taxonomy: [string, string, string];
  inventory_models: InventoryModel[];
  required_skills: string[];
  required_equipment: string[];
  aesthetic_clusters: string[];
  typical_price_range: [number, number];
  modeled_net_margin_pct: number;
  seasonality_index_q4: number;
  seasonality_year_round: number;
  policy_risk_flags: string[];
  default_search_query: string;
  etsy_search_url: string;
  hero_img: string;
  // What this seller actually needs from Creative Fabrica — not the product
  // they're selling but the design assets that support making/marketing it.
  // (Templates to remix for digital sellers; clipart/SVGs for POD sellers;
  // mockups, fonts, labels, or embroidery patterns for handmade sellers.)
  cf_query: string;
};

export type FirecrawlSignal = {
  total_listings: string;
  top_10_avg_reviews: number;
  top_10_avg_age_months: number;
  top_10_avg_price: string;
  related_searches: string[];
  signal_unavailable?: boolean;
};

export type SubScores = {
  demand: number;
  competition: number;
  margin: number;
  ltv: number;
  seasonality: number;
  ad_recovery: number;
  policy_penalty: number;
  whitespace_bonus: number;
};

export type ResultNiche = {
  id: string;
  rank: number;
  name: string;
  taxonomy: string[];
  inventory_model: InventoryModel;
  score: number;
  sub_scores: SubScores;
  confidence: "high" | "medium" | "low";
  missing_signals: string[];
  why: string;
  startup_cost: string;
  time_to_first_sale: string;
  product_ideas: string[];
  policy_risk_notes?: string | null;
  cf_query: string;
  firecrawl: FirecrawlSignal;
  hero_img: string;
  tags: string[];
};

export type GenerateResponse = {
  niches: ResultNiche[];
  source: "claude" | "mock";
  warning?: string;
};
