/**
 * Luma.Green's material codes — the catalogue every screen, price and trade
 * uses. Edit this file to add or rename a material, then re-run the seed
 * (`npx convex run demo:reset`). Names are per language; anything missing
 * falls back to English.
 *
 * Prices are Bengaluru SAMPLE figures for the prototype (paise per kg), not
 * market data. CO2e factors are indicative (kg CO2e avoided per kg recycled
 * instead of made new), rounded from published averages such as the US EPA
 * WARM model — replace them with sourced factors before any public claim.
 */

export type Family =
  "paper" | "plastic" | "metal" | "glass" | "ewaste" | "other";

export interface CatalogueEntry {
  code: string;
  family: Family;
  /** Scrap is bought from households; recycled output is sold to factories. */
  stage: "scrap" | "recycled";
  names: { en: string; hi: string; kn: string } & Record<string, string>;
  /** Bengaluru sample prices, paise per kg: the admin floor and fallback. */
  floorPaise: number;
  fallbackPaise: number;
  co2eFactor: number;
}

export const CATALOGUE: readonly CatalogueEntry[] = [
  {
    code: "PAPER-NEWS",
    family: "paper",
    stage: "scrap",
    names: { en: "Newspaper", hi: "अख़बार (रद्दी)", kn: "ದಿನಪತ್ರಿಕೆ (ರದ್ದಿ)" },
    floorPaise: 1200,
    fallbackPaise: 1400,
    co2eFactor: 1,
  },
  {
    code: "PAPER-CARTON",
    family: "paper",
    stage: "scrap",
    names: { en: "Cardboard boxes", hi: "गत्ता", kn: "ರಟ್ಟು ಡಬ್ಬಗಳು" },
    floorPaise: 800,
    fallbackPaise: 1000,
    co2eFactor: 1,
  },
  {
    code: "PAPER-BOOKS",
    family: "paper",
    stage: "scrap",
    names: {
      en: "Books and notebooks",
      hi: "किताबें और कॉपियाँ",
      kn: "ಪುಸ್ತಕ ಮತ್ತು ನೋಟ್‌ಬುಕ್",
    },
    floorPaise: 1000,
    fallbackPaise: 1200,
    co2eFactor: 1,
  },
  {
    code: "PAPER-OFFICE",
    family: "paper",
    stage: "scrap",
    names: { en: "White office paper", hi: "सफ़ेद कागज़", kn: "ಬಿಳಿ ಕಾಗದ" },
    floorPaise: 1400,
    fallbackPaise: 1600,
    co2eFactor: 1,
  },
  {
    code: "PAPER-MIXED",
    family: "paper",
    stage: "scrap",
    names: { en: "Mixed paper", hi: "मिक्स कागज़", kn: "ಮಿಶ್ರ ಕಾಗದ" },
    floorPaise: 600,
    fallbackPaise: 800,
    co2eFactor: 1,
  },
  {
    code: "PLASTIC-PET",
    family: "plastic",
    stage: "scrap",
    names: { en: "PET bottles", hi: "पेट बोतलें", kn: "ಪೆಟ್ ಬಾಟಲಿ" },
    floorPaise: 1600,
    fallbackPaise: 2000,
    co2eFactor: 1.5,
  },
  {
    code: "PLASTIC-HDPE",
    family: "plastic",
    stage: "scrap",
    names: {
      en: "Hard plastic (HDPE)",
      hi: "सख़्त प्लास्टिक",
      kn: "ಗಟ್ಟಿ ಪ್ಲಾಸ್ಟಿಕ್",
    },
    floorPaise: 1800,
    fallbackPaise: 2200,
    co2eFactor: 1,
  },
  {
    code: "PLASTIC-PP",
    family: "plastic",
    stage: "scrap",
    names: {
      en: "Plastic containers (PP)",
      hi: "प्लास्टिक डिब्बे",
      kn: "ಪ್ಲಾಸ್ಟಿಕ್ ಡಬ್ಬಿ",
    },
    floorPaise: 1400,
    fallbackPaise: 1800,
    co2eFactor: 1,
  },
  {
    code: "PLASTIC-LDPE",
    family: "plastic",
    stage: "scrap",
    names: {
      en: "Plastic covers (LDPE)",
      hi: "प्लास्टिक थैलियाँ",
      kn: "ಪ್ಲಾಸ್ಟಿಕ್ ಕವರ್",
    },
    floorPaise: 800,
    fallbackPaise: 1000,
    co2eFactor: 1,
  },
  {
    code: "PLASTIC-MIXED",
    family: "plastic",
    stage: "scrap",
    names: {
      en: "Mixed plastic",
      hi: "मिक्स प्लास्टिक",
      kn: "ಮಿಶ್ರ ಪ್ಲಾಸ್ಟಿಕ್",
    },
    floorPaise: 400,
    fallbackPaise: 600,
    co2eFactor: 0.8,
  },
  {
    code: "METAL-IRON",
    family: "metal",
    stage: "scrap",
    names: { en: "Iron and steel", hi: "लोहा", kn: "ಕಬ್ಬಿಣ" },
    floorPaise: 2400,
    fallbackPaise: 2800,
    co2eFactor: 1.5,
  },
  {
    code: "METAL-SS",
    family: "metal",
    stage: "scrap",
    names: { en: "Stainless steel", hi: "स्टेनलेस स्टील", kn: "ಸ್ಟೀಲ್" },
    floorPaise: 4500,
    fallbackPaise: 5500,
    co2eFactor: 1.5,
  },
  {
    code: "METAL-ALU-CAN",
    family: "metal",
    stage: "scrap",
    names: {
      en: "Aluminium cans",
      hi: "एल्युमिनियम कैन",
      kn: "ಅಲ್ಯೂಮಿನಿಯಂ ಕ್ಯಾನ್",
    },
    floorPaise: 9000,
    fallbackPaise: 11_000,
    co2eFactor: 9,
  },
  {
    code: "METAL-ALU",
    family: "metal",
    stage: "scrap",
    names: {
      en: "Aluminium (utensils)",
      hi: "एल्युमिनियम बर्तन",
      kn: "ಅಲ್ಯೂಮಿನಿಯಂ ಪಾತ್ರೆ",
    },
    floorPaise: 11_000,
    fallbackPaise: 13_000,
    co2eFactor: 9,
  },
  {
    code: "METAL-COPPER",
    family: "metal",
    stage: "scrap",
    names: { en: "Copper", hi: "तांबा", kn: "ತಾಮ್ರ" },
    floorPaise: 55_000,
    fallbackPaise: 65_000,
    co2eFactor: 3,
  },
  {
    code: "METAL-BRASS",
    family: "metal",
    stage: "scrap",
    names: { en: "Brass", hi: "पीतल", kn: "ಹಿತ್ತಾಳೆ" },
    floorPaise: 32_000,
    fallbackPaise: 38_000,
    co2eFactor: 2.5,
  },
  {
    code: "GLASS-BOTTLE",
    family: "glass",
    stage: "scrap",
    names: { en: "Glass bottles", hi: "काँच की बोतलें", kn: "ಗಾಜಿನ ಬಾಟಲಿ" },
    floorPaise: 100,
    fallbackPaise: 200,
    co2eFactor: 0.3,
  },
  {
    code: "EWASTE-SMALL",
    family: "ewaste",
    stage: "scrap",
    names: {
      en: "Small electronics",
      hi: "छोटे इलेक्ट्रॉनिक्स",
      kn: "ಸಣ್ಣ ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್",
    },
    floorPaise: 2000,
    fallbackPaise: 3000,
    co2eFactor: 2,
  },
  {
    code: "EWASTE-PHONE",
    family: "ewaste",
    stage: "scrap",
    names: { en: "Old mobile phones", hi: "पुराने मोबाइल", kn: "ಹಳೆಯ ಮೊಬೈಲ್" },
    floorPaise: 10_000,
    fallbackPaise: 15_000,
    co2eFactor: 2,
  },
  {
    code: "EWASTE-CABLE",
    family: "ewaste",
    stage: "scrap",
    names: {
      en: "Wires and cables",
      hi: "तार और केबल",
      kn: "ತಂತಿ ಮತ್ತು ಕೇಬಲ್",
    },
    floorPaise: 8000,
    fallbackPaise: 10_000,
    co2eFactor: 2,
  },
  {
    code: "EWASTE-BATTERY",
    family: "ewaste",
    stage: "scrap",
    names: {
      en: "Lead batteries",
      hi: "बैटरी (इन्वर्टर, गाड़ी)",
      kn: "ಬ್ಯಾಟರಿ (ಇನ್ವರ್ಟರ್, ವಾಹನ)",
    },
    floorPaise: 7000,
    fallbackPaise: 8500,
    co2eFactor: 1,
  },
  {
    code: "OTHER-CLOTHES",
    family: "other",
    stage: "scrap",
    names: { en: "Old clothes", hi: "पुराने कपड़े", kn: "ಹಳೆಯ ಬಟ್ಟೆ" },
    floorPaise: 300,
    fallbackPaise: 500,
    co2eFactor: 3,
  },
  // Recycled output: what recyclers sell to manufacturers. Prices are per kg
  // at the factory gate; floor and fallback don't apply to households here.
  {
    code: "RECYCLED-PET-FLAKE",
    family: "plastic",
    stage: "recycled",
    names: {
      en: "Recycled PET flakes",
      hi: "रीसायकल्ड पेट फ़्लेक्स",
      kn: "ಮರುಬಳಕೆ ಪೆಟ್ ಫ್ಲೇಕ್ಸ್",
    },
    floorPaise: 5500,
    fallbackPaise: 6500,
    co2eFactor: 1.5,
  },
  {
    code: "RECYCLED-HDPE-GRANULE",
    family: "plastic",
    stage: "recycled",
    names: {
      en: "Recycled HDPE granules",
      hi: "रीसायकल्ड HDPE दाने",
      kn: "ಮರುಬಳಕೆ HDPE ಕಣಗಳು",
    },
    floorPaise: 6000,
    fallbackPaise: 7000,
    co2eFactor: 1,
  },
  {
    code: "RECYCLED-KRAFT",
    family: "paper",
    stage: "recycled",
    names: {
      en: "Recycled kraft paper",
      hi: "रीसायकल्ड क्राफ़्ट पेपर",
      kn: "ಮರುಬಳಕೆ ಕ್ರಾಫ್ಟ್ ಕಾಗದ",
    },
    floorPaise: 3200,
    fallbackPaise: 3800,
    co2eFactor: 1,
  },
  {
    code: "RECYCLED-ALU-INGOT",
    family: "metal",
    stage: "recycled",
    names: {
      en: "Recycled aluminium ingots",
      hi: "रीसायकल्ड एल्युमिनियम सिल्लियाँ",
      kn: "ಮರುಬಳಕೆ ಅಲ್ಯೂಮಿನಿಯಂ ಗಟ್ಟಿ",
    },
    floorPaise: 18_000,
    fallbackPaise: 21_000,
    co2eFactor: 9,
  },
];

/** How much more each step up the chain typically pays (prototype data). */
export const CHAIN_MARKUP: Record<"kabadiwala" | "yard" | "recycler", number> =
  {
    kabadiwala: 1.25, // a yard pays a kabadiwala ~25% over the household price
    yard: 1.45, // a recycler pays a yard ~45% over it
    recycler: 1.7, // a manufacturer pays a recycler ~70% over it
  };

export function catalogueEntry(code: string): CatalogueEntry | undefined {
  return CATALOGUE.find((entry) => entry.code === code);
}

/** A material's name in a language, falling back to English. */
export function materialName(
  names: Record<string, string> | undefined,
  locale: string,
  code: string,
): string {
  return names?.[locale] ?? names?.en ?? code;
}
