/* Quiz schema (8 Qs across 5 steps) — typed version of the prototype's quiz-data.js */

import type { SellerProfile } from "@/lib/types";

type Headline = (string | { em: string })[];

type SingleQuestion = {
  key: string;
  type: "single";
  headline: Headline;
  sub: string;
  layout: "tile-grid-2" | "tile-list";
  options: { v: string; label: string; hint?: string; icon?: string }[];
  required: boolean;
  conditional?: (a: Partial<SellerProfile>) => boolean;
};

type MultiQuestion = {
  key: string;
  type: "multi";
  headline: Headline;
  sub: string;
  layout: "checks-grouped" | "checks-grid";
  groups?: { name: string; options: { v: string; label: string }[] }[];
  options?: { v: string; label: string; icon?: string }[];
  required?: boolean;
  conditional?: (a: Partial<SellerProfile>) => boolean;
};

type ImageMultiQuestion = {
  key: string;
  type: "multi-max";
  max: number;
  headline: Headline;
  sub: string;
  layout: "image-grid";
  options: {
    v: string;
    label: string;
    desc: string;
    icon: string;
    hue: number;
    img: string;
  }[];
  required: boolean;
  conditional?: (a: Partial<SellerProfile>) => boolean;
};

export type Question = SingleQuestion | MultiQuestion | ImageMultiQuestion;

export const NF_QUIZ: {
  steps: { id: number; questions: string[] }[];
  questions: Record<string, Question>;
} = {
  steps: [
    { id: 1, questions: ["q1"] },
    { id: 2, questions: ["q2", "q3"] },
    { id: 3, questions: ["q4", "q5"] },
    { id: 4, questions: ["q6", "q8"] },
    { id: 5, questions: ["q7"] },
  ],
  questions: {
    q1: {
      key: "q1",
      type: "single",
      headline: ["What's the ", { em: "dream" }, " here?"],
      sub: "Pick the one closest to true.",
      layout: "tile-grid-2",
      options: [
        { v: "passion", label: "A creative side project that pays for itself", icon: "fa-solid fa-seedling" },
        { v: "side", label: "Real side income — a few hundred to a few thousand a month", icon: "fa-solid fa-coins" },
        { v: "fulltime", label: "Replace my day job within a year or two", icon: "fa-solid fa-rocket" },
        { v: "brand", label: "Build a brand I'm proud of, money is secondary", icon: "fa-solid fa-feather-pointed" },
      ],
      required: true,
    },
    q2: {
      key: "q2",
      type: "single",
      headline: ["How much ", { em: "time" }, " can you give it each week?"],
      sub: "Be honest, not aspirational.",
      layout: "tile-list",
      options: [
        { v: "1-5", label: "1–5 hours", hint: "evenings & weekends", icon: "fa-solid fa-mug-hot" },
        { v: "5-15", label: "5–15 hours", hint: "serious side hustle", icon: "fa-solid fa-clock" },
        { v: "15-30", label: "15–30 hours", hint: "part-time commitment", icon: "fa-solid fa-hourglass-half" },
        { v: "30+", label: "30+ hours", hint: "this is my main thing", icon: "fa-solid fa-fire-flame-curved" },
      ],
      required: true,
    },
    q3: {
      key: "q3",
      type: "single",
      headline: ["What can you ", { em: "invest" }, " to get started?"],
      sub: "Materials, software, listing fees, ads.",
      layout: "tile-list",
      options: [
        { v: "under-100", label: "Under $100", hint: "keep it lean", icon: "fa-solid fa-piggy-bank" },
        { v: "100-500", label: "$100–500", hint: "comfortable starting point", icon: "fa-solid fa-wallet" },
        { v: "500-2000", label: "$500–2,000", hint: "real runway", icon: "fa-solid fa-money-bill-trend-up" },
        { v: "2000+", label: "$2,000+", hint: "I'm fully committing", icon: "fa-solid fa-sack-dollar" },
      ],
      required: true,
    },
    q4: {
      key: "q4",
      type: "single",
      headline: ["How do you want to ", { em: "handle" }, " products?"],
      sub: "There's no wrong answer — this just shapes what we recommend.",
      layout: "tile-grid-2",
      options: [
        { v: "digital", label: "Digital downloads only", hint: "Highest margin, lowest effort. Saturated in some categories.", icon: "fa-solid fa-cloud-arrow-down" },
        { v: "pod", label: "Print-on-demand", hint: "Partner prints and ships for me (Printful, Printify).", icon: "fa-solid fa-shirt" },
        { v: "made", label: "Made-to-order by hand", hint: "Highest perceived value. Time-intensive.", icon: "fa-solid fa-hand-sparkles" },
        { v: "stock", label: "Stock physical inventory", hint: "Capital-intensive. Best margins on physical goods.", icon: "fa-solid fa-boxes-stacked" },
        { v: "unsure", label: "Not sure yet — show me what fits", hint: "We'll keep it open.", icon: "fa-solid fa-compass" },
      ],
      required: true,
    },
    q5: {
      key: "q5",
      type: "multi",
      headline: ["Which of these can you ", { em: "actually" }, " do?"],
      sub: "Check all that apply — be honest, not aspirational.",
      layout: "checks-grouped",
      groups: [
        {
          name: "Design",
          options: [
            { v: "design-pro", label: "I'm comfortable in Photoshop, Illustrator, or Affinity" },
            { v: "design-canva", label: "I use Canva confidently" },
            { v: "design-ai", label: "I can use AI design tools (Midjourney, CF Spark, etc.)" },
            { v: "design-illus", label: "I can illustrate / draw / paint" },
          ],
        },
        {
          name: "Craft",
          options: [
            { v: "craft-sewing", label: "Sewing, quilting, or fabric work" },
            { v: "craft-jewelry", label: "Jewelry making (metalwork, beading, resin)" },
            { v: "craft-pottery", label: "Pottery, ceramics, or sculpting" },
            { v: "craft-wood", label: "Woodworking, leatherwork, or carving" },
            { v: "craft-fiber", label: "Embroidery, cross-stitch, or fiber arts" },
            { v: "craft-candle", label: "Candle, soap, or bath product making" },
          ],
        },
        {
          name: "Other",
          options: [
            { v: "photo", label: "Photography" },
            { v: "lettering", label: "Hand lettering or calligraphy" },
            { v: "zero", label: "I'm starting from zero — teach me as we go" },
          ],
        },
      ],
      required: true,
    },
    q6: {
      key: "q6",
      type: "multi",
      headline: ["What ", { em: "gear" }, " do you actually have?"],
      sub: "Owned, borrowed, or in your local makerspace all count.",
      layout: "checks-grid",
      conditional: (a) =>
        ["made", "stock"].includes(a.q4 ?? "") ||
        (a.q5 ?? []).some((s) => s.startsWith("craft-")),
      options: [
        { v: "printer", label: "Home printer (inkjet or laser)", icon: "fa-solid fa-print" },
        { v: "cricut", label: "Cricut, Silhouette, or cutter", icon: "fa-solid fa-scissors" },
        { v: "sewing", label: "Sewing machine", icon: "fa-solid fa-mitten" },
        { v: "embroidery", label: "Embroidery machine", icon: "fa-solid fa-stamp" },
        { v: "sublim", label: "Sublimation printer + heat press", icon: "fa-solid fa-fire" },
        { v: "kiln", label: "Kiln or pottery wheel", icon: "fa-solid fa-jar" },
        { v: "3dprint", label: "3D printer", icon: "fa-solid fa-cube" },
        { v: "camera", label: "Camera (DSLR/mirrorless)", icon: "fa-solid fa-camera" },
        { v: "none", label: "None of the above (yet)", icon: "fa-solid fa-circle-minus" },
      ],
    },
    q7: {
      key: "q7",
      type: "multi-max",
      max: 2,
      headline: ["Which ", { em: "vibe" }, " is most you?"],
      sub: "Pick your top 2. This shapes what your shop will look like.",
      layout: "image-grid",
      options: [
        { v: "cottagecore", label: "Cottagecore", desc: "soft, rural, romantic", icon: "fa-solid fa-leaf", hue: 90, img: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600&q=70&auto=format&fit=crop" },
        { v: "darkacademia", label: "Dark academia", desc: "moody, scholarly, vintage", icon: "fa-solid fa-book-open", hue: 25, img: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=70&auto=format&fit=crop" },
        { v: "minimalist", label: "Modern minimalist", desc: "clean, neutral, structural", icon: "fa-solid fa-square", hue: 200, img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600&q=70&auto=format&fit=crop" },
        { v: "boho", label: "Boho", desc: "earthy, layered, eclectic", icon: "fa-solid fa-feather", hue: 35, img: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&q=70&auto=format&fit=crop" },
        { v: "y2k", label: "Y2K", desc: "playful, bright, 2000s", icon: "fa-solid fa-compact-disc", hue: 320, img: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&q=70&auto=format&fit=crop" },
        { v: "kawaii", label: "Kawaii", desc: "cute, soft pastels, cheerful", icon: "fa-solid fa-heart", hue: 350, img: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=600&q=70&auto=format&fit=crop" },
        { v: "witchy", label: "Witchy / mystical", desc: "celestial, herbal, occult", icon: "fa-solid fa-moon", hue: 270, img: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&q=70&auto=format&fit=crop" },
        { v: "coquette", label: "Coquette", desc: "feminine, ribbons, soft pinks", icon: "fa-solid fa-ribbon", hue: 340, img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=70&auto=format&fit=crop" },
        { v: "maximalist", label: "Maximalist", desc: "bold, layered, color-rich", icon: "fa-solid fa-palette", hue: 15, img: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&q=70&auto=format&fit=crop" },
        { v: "evergreen", label: "Evergreen", desc: "no specific vibe, broad appeal", icon: "fa-solid fa-tree", hue: 130, img: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=600&q=70&auto=format&fit=crop" },
      ],
      required: true,
    },
    q8: {
      key: "q8",
      type: "single",
      headline: ["When does this need to ", { em: "start" }, " working?"],
      sub: "No judgment — this changes which niches we recommend.",
      layout: "tile-list",
      options: [
        { v: "30-days", label: "Next 30 days", hint: "I need momentum fast", icon: "fa-solid fa-bolt" },
        { v: "2-3-months", label: "2–3 months", hint: "willing to build a foundation", icon: "fa-solid fa-calendar-day" },
        { v: "6-12-months", label: "6–12 months", hint: "playing the long game", icon: "fa-solid fa-chess" },
        { v: "exploring", label: "No deadline", hint: "just exploring", icon: "fa-solid fa-binoculars" },
      ],
      required: true,
    },
  },
};

export const SCORE_LABELS = {
  demand: { max: 25, label: "Demand" },
  competition: { max: 20, label: "Competition" },
  margin: { max: 20, label: "Margin" },
  ltv: { max: 10, label: "LTV / Repeat" },
  seasonality: { max: 10, label: "Seasonality" },
  ad_recovery: { max: 10, label: "Ad recovery" },
  whitespace_bonus: { max: 15, label: "Whitespace bonus" },
  policy_penalty: { max: 15, label: "Policy risk" },
} as const;

export const DEFAULT_ANSWERS: SellerProfile = {
  q1: "passion",
  q2: "5-15",
  q3: "under-100",
  q4: "digital",
  q5: ["design-canva", "design-ai"],
  q6: [],
  q7: ["boho", "minimalist"],
  q8: "2-3-months",
};

export const LOADING_LINES = [
  "Matching your skills to our niche catalog…",
  "Filtering by your time, budget, and equipment…",
  "Pulling live search signals from Google…",
  "Counting Etsy presence across candidate niches…",
  "Cross-referencing margins, seasonality, and LTV…",
  "Surfacing the buyer language that converts…",
  "Weighting aesthetic fit against your top picks…",
  "Stress-testing each candidate for policy risk…",
  "Sanity-checking the top three with Claude…",
  "Finalizing your match scores…",
];
