/**
 * Imajica Bacoor franchise service menu (from franchise price list screenshots).
 * Same shape as SERVICE_CATALOG_SEED rows — merged in catalogService.
 *
 * Items flagged in REVIEW_NEEDED stay in the catalog but need human confirmation.
 */
import type { ServiceSeedRow } from '@/constants/serviceCatalogSeed'

export const BACOOR_BRANCH = 'Bacoor, Cavite' as const

/** Names / combos the franchise should confirm before trusting blindly. */
export const BACOOR_PRICE_REVIEW_NEEDED: Array<{
  reason: string
  items: string[]
}> = [
  {
    reason: 'Exact duplicate row in source list (same name, sessions, price)',
    items: ['HYDRA ELITE FACIAL · 1 · ₱3,500 (listed twice)'],
  },
  {
    reason: 'Same name + sessions but different prices in the source list',
    items: [
      'IMMUNITY DRIP · 1 · ₱2,000 vs ₱500',
      'WARTS REMOVAL · 1 · ₱1,499 (Active) vs ₱2,500 (Inactive)',
      'SKINTAG REMOVAL · 1 · ₱1,000 (Inactive) vs ₱1,499 (Active)',
      'SLENDER DRIP · 5 · ₱9,500 (Inactive) vs ₱10,000 (Inactive/Active variants)',
    ],
  },
  {
    reason: 'Looks like a payment / balance stub, not a sellable menu item',
    items: [
      'IMAJICA CLEAR HALF PAYMENT · 1 · ₱7,500',
      'IMAJICA CLEAR BALANCE FOR MS. JASMINE JADE CRUZ · 1 · ₱7,500',
    ],
  },
  {
    reason: 'Ambiguous / abbreviated name — confirm meaning',
    items: ['LB 15% · 2 · ₱12,750 (likely Lemon Bottle)', 'UA 20% · 8 · ₱12,000', 'NECK / CHEST / BACK (body area only)'],
  },
  {
    reason: 'Same display name with different session packs (kept as separate SKUs — confirm intentional)',
    items: [
      'IMAJICA CELEBRITY · 5/1/3 sessions',
      'IMAJICA GLOW · 1 vs 5',
      'IMAJICA BRIGHT · 1 vs 5',
      'LEMON BOTTLE · 1 vs 3',
      'EXILIS TUMMY · 1 vs 4',
      'SKIN BOOSTER · 1 vs 5',
      'AGE REVERSING DRIP · 1 vs 15',
      'IMMUNITY DRIP · 1/5/15',
    ],
  },
]

/**
 * Canonical Bacoor menu used in the app.
 * For conflicting same name+sessions, we keep the Active / higher-confidence row
 * and leave the alternate in REVIEW_NEEDED (not silently dropped without note).
 */
export const BACOOR_SERVICE_CATALOG_SEED: ServiceSeedRow[] = [
  // Page 1
  { name: 'IMAJICA AQUA', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1999 },
  { name: 'MULTI VITAMINS DRIP', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2500 },
  { name: 'FREE MULTIVITAMIN DRIP', sessions: 2, branch: BACOOR_BRANCH, status: 'active', price: 0 },
  { name: 'IMAJICA CLEAR', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 15000 },
  { name: 'IMAJICA CELEBRITY', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 15000 },
  { name: 'IMAJICA CELEBRITY', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 4499 },
  { name: 'IMAJICA GLOW', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 3499 },
  { name: 'IMAJICA BRIGHT', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 3499 },
  { name: 'IMAJICA DELUXE', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 4999 },
  { name: 'DIODE UPPER LIP HAIR REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 499 },

  // Page 2
  { name: 'DIODE FULL FACE HAIR REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1499 },
  { name: 'DIODE UNDERARMS HAIR REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1499 },
  { name: 'DIODE HALF ARMS HAIR REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1999 },
  { name: 'DIODE FULL ARMS HAIR REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2499 },
  { name: 'BRAZILIAN', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1999 },
  { name: 'DIODE HALF LEGS HAIR REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1999 },
  { name: 'DIODE FULL LEGS HAIR REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2999 },
  { name: 'PIMPLE INJECT', sessions: 1, branch: BACOOR_BRANCH, status: 'inactive', price: 250 },
  { name: 'K-GLOW FACIAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2499 },
  { name: 'CHARCOAL LASER FACIAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2499 },

  // Page 3
  { name: 'PICO LASER FACIAL', sessions: 1, branch: BACOOR_BRANCH, status: 'inactive', price: 2499 },
  { name: 'HYDRA FACIAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2499 },
  { name: 'OXYBRIGHT FACIAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2500 },
  { name: 'IMAJICA BRIGHT', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 12999 },
  { name: 'IMAJICA GLOW', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 11999 },
  { name: 'IMAJICA CLEAR BACK AREA', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 14999 },
  { name: 'IMAJICA CLEAR CHEST AREA', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 14999 },
  { name: 'BIO REVIVE (ACNE SCAR MANAGEMENT)', sessions: 2, branch: BACOOR_BRANCH, status: 'active', price: 30000 },
  { name: 'MESO DNA (ACNE SCAR MANAGEMENT)', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 30000 },
  { name: 'MESO MELA', sessions: 5, branch: BACOOR_BRANCH, status: 'inactive', price: 24999 },

  // Page 4
  { name: 'BIO MELA (MELASMA TREATMENT)', sessions: 2, branch: BACOOR_BRANCH, status: 'active', price: 30000 },
  { name: 'IMAJICA PREMIUM', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 17999 },
  { name: 'IMAJICA REVIVE (ACNE SCAR MANAGEMENT)', sessions: 6, branch: BACOOR_BRANCH, status: 'active', price: 25000 },
  { name: 'VAMPIRE FACIAL (PRP)', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 20000 },
  { name: 'IMAJICA BRIGHT UNDERARM', sessions: 8, branch: BACOOR_BRANCH, status: 'active', price: 15000 },
  { name: 'SYRINGOMA REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1499 },
  { name: 'LEMON BOTTLE', sessions: 3, branch: BACOOR_BRANCH, status: 'active', price: 15000 },
  { name: 'LEMON BOTTLE', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 5000 },
  { name: 'EXILIS FACE AND NECK', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1500 },
  { name: 'EXILIS TUMMY', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2500 },

  // Page 5 — kept ₱2,000 Immunity 1-session as primary; ₱500 flagged for review
  { name: 'ADD-ONS L-CARN', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 500 },
  { name: 'IMMUNITY DRIP', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2000 },
  // Same name as screenshot (₱500 1-session variant)
  { name: 'IMMUNITY DRIP', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 500 },
  { name: 'CLEANING SURGICAL SITE', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 500 },
  { name: 'EXIPRO GROIN', sessions: 7, branch: BACOOR_BRANCH, status: 'active', price: 7000 },
  { name: 'FLAWLESS UNDERARM', sessions: 10, branch: BACOOR_BRANCH, status: 'active', price: 15000 },
  { name: 'DIODE UPPER LIP', sessions: 10, branch: BACOOR_BRANCH, status: 'active', price: 3000 },
  { name: 'ADD-ONS COLLAGEN', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 500 },
  { name: 'IMMUNITY DRIP', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 10000 },
  { name: 'BARBIE BACK', sessions: 1, branch: BACOOR_BRANCH, status: 'inactive', price: 3898 },

  // Page 6
  { name: 'TRIFECTA', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 10000 },
  { name: 'BARBIE FACE', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2999 },
  { name: 'MESO WITH EXIPRO (ARMS)', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2499 },
  { name: 'MESO WITH EXIPRO (TUMMY)', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 3499 },
  { name: 'CO2+MICRONEEDLING', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 5000 },
  { name: 'MULTIVITAMINS DRIP 5+1', sessions: 6, branch: BACOOR_BRANCH, status: 'active', price: 12500 },
  { name: 'ADD-ONS VIT C', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 250 },
  { name: 'ALARTOX', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 3999 },
  { name: 'SCLERO THERAPY', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 6000 },
  { name: 'DIODE HALF LEGS', sessions: 10, branch: BACOOR_BRANCH, status: 'active', price: 15000 },

  // Page 7 — SLENDER DRIP 5 kept at ₱10,000 active (common price); ₱9,500 inactive flagged
  { name: 'SLENDER DRIP', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 10000 },
  { name: 'SLENDER DRIP', sessions: 5, branch: BACOOR_BRANCH, status: 'inactive', price: 9500 },
  { name: 'WARTS REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1499 },
  { name: 'GLP', sessions: 4, branch: BACOOR_BRANCH, status: 'active', price: 30000 },
  { name: 'DIODE UNDERARM', sessions: 10, branch: BACOOR_BRANCH, status: 'active', price: 10000 },
  { name: 'SWEATOX', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 10000 },
  { name: 'EXIPRO', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1500 },
  { name: 'SLENDER DRIP', sessions: 1, branch: BACOOR_BRANCH, status: 'inactive', price: 2000 },
  { name: 'FRACTIONAL LASER HALF LEGS', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 20000 },
  { name: 'WHITENING UNDERARM', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1499 },
  { name: 'CHARCOAL LASER UA', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1500 },

  // Page 8
  { name: 'CHARCOAL FACIAL', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 7500 },
  { name: 'SKIN BOOSTER', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 25000 },
  { name: 'ULTRAFORMER+LEMON BOTTLE', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 13000 },
  { name: 'MILIA REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1500 },
  { name: 'TATTOO REMOVAL (2X2)', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1499 },
  { name: 'TATTOO REMOVAL 2X2', sessions: 4, branch: BACOOR_BRANCH, status: 'active', price: 6000 },
  { name: 'CHARCOAL LASER ELBOW PACKAGE', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 7500 },
  { name: 'CHEMICAL PEELING ELBOW', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 12500 },
  { name: 'CHARCOAL & CHEMICAL PEELING ELBOW', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 16000 },
  { name: 'IMAJICA CLEAR (20%)', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 12000 },

  // Page 9
  { name: 'LEMON BOTTLE (20%)', sessions: 3, branch: BACOOR_BRANCH, status: 'active', price: 12000 },
  { name: 'MESOMELA (20%)', sessions: 6, branch: BACOOR_BRANCH, status: 'active', price: 20000 },
  { name: 'CHEMICAL PEEL AND CHARCOAL LASER', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 20000 },
  { name: 'IMAJICA AQUA PACKAGE', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 4000 },
  { name: 'IMAJICA CLEAR SINGLE', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 4400 },
  { name: 'WARTS REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'inactive', price: 2500 },
  { name: 'INTENSIVE UNDER ARM TREATMENT', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2500 },
  { name: 'WARTS REMOVAL 20%', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2000 },
  { name: 'IMAJICA CELEBRITY 20%', sessions: 6, branch: BACOOR_BRANCH, status: 'active', price: 12000 },
  { name: 'LB 15%', sessions: 2, branch: BACOOR_BRANCH, status: 'active', price: 12750 },

  // Page 10
  { name: 'SLENDER 15%', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1700 },
  { name: 'ULTRAFORMER 20%', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 8000 },
  { name: 'SKINTAG REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1499 },
  { name: 'SKINTAG REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'inactive', price: 1000 },
  { name: 'MULTIVITAMINS 20%', sessions: 6, branch: BACOOR_BRANCH, status: 'active', price: 10000 },
  { name: 'ULTRAFORMER', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 10000 },
  { name: 'MESOMELA I', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 5000 },
  { name: 'AGE REVERSING DRIP', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2000 },
  { name: 'SCAR SMALL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2500 },
  { name: 'SLIMMING DRIP', sessions: 4, branch: BACOOR_BRANCH, status: 'active', price: 8000 },
  { name: 'EXILIS TUMMY', sessions: 4, branch: BACOOR_BRANCH, status: 'active', price: 10000 },

  // Page 11 — keep payment stubs inactive so they do not sell by mistake
  { name: 'IMAJICA CLEAR HALF PAYMENT', sessions: 1, branch: BACOOR_BRANCH, status: 'inactive', price: 7500 },
  { name: 'SLENDER TWO', sessions: 2, branch: BACOOR_BRANCH, status: 'active', price: 4000 },
  { name: 'MULTIVITAMINS DRIP 10+5', sessions: 15, branch: BACOOR_BRANCH, status: 'active', price: 25000 },
  { name: 'CO2 FRACTIONAL FACE', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 4000 },
  { name: 'IMAJICA CELEBRITY', sessions: 3, branch: BACOOR_BRANCH, status: 'inactive', price: 10000 },
  { name: 'UA BRIGHT', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 10000 },
  { name: 'IMAJICA CLEAR BALANCE FOR MS. JASMINE JADE CRUZ', sessions: 1, branch: BACOOR_BRANCH, status: 'inactive', price: 7500 },
  { name: 'SLIMMING ELITE', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 30000 },
  { name: 'SLIMMING GLOW ELITE', sessions: 10, branch: BACOOR_BRANCH, status: 'active', price: 50000 },

  // Page 12
  { name: 'RADIANCE GLOW FACE', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 10000 },
  { name: 'WARTS BODY', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 7000 },
  { name: 'FULL FACE DIODE', sessions: 10, branch: BACOOR_BRANCH, status: 'active', price: 10000 },
  { name: 'RADIANT LIFT', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 15000 },
  { name: 'WHITENING BODY', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 8500 },
  { name: 'REVIVE BALANCE', sessions: 3, branch: BACOOR_BRANCH, status: 'active', price: 18000 },
  { name: 'SKIN BOOSTER', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 5000 },
  { name: 'WHITENING LASER', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 8500 },
  { name: 'AGE REVERSING DRIP', sessions: 15, branch: BACOOR_BRANCH, status: 'active', price: 20000 },
  { name: 'IMMUNITY DRIP', sessions: 15, branch: BACOOR_BRANCH, status: 'active', price: 20000 },

  // Page 13 (deduped HYDRA ELITE)
  { name: 'HYDRA ELITE FACIAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 3500 },
  { name: 'MICRONEEDLING', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 3000 },
  { name: 'IMAJICA REVIVE 20%', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 20000 },
  { name: 'PRP CO2', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 8000 },
  { name: 'ANTI AGING', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 7000 },
  { name: 'INTIMATE WHITENING', sessions: 8, branch: BACOOR_BRANCH, status: 'active', price: 17999 },
  { name: 'BUTT WHITENING PACKAGE', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 17999 },
  { name: 'OXYELITE FACIAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 3500 },
  { name: 'UA 20%', sessions: 8, branch: BACOOR_BRANCH, status: 'active', price: 12000 },

  // Page 14
  { name: 'DIODE 20%', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 2400 },
  { name: 'INTIMATE 20%', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 14400 },
  { name: 'ACNE FACIAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2500 },
  { name: 'AGE REVERSING', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 10000 },
  { name: 'WHITENING BOOSTER', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 500 },
  { name: 'WHITENING BOOSTER', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 2000 },
  { name: 'BRIGHT UNDERARM', sessions: 8, branch: BACOOR_BRANCH, status: 'active', price: 15000 },
  { name: 'FLAWLESS UA', sessions: 10, branch: BACOOR_BRANCH, status: 'active', price: 15000 },
  { name: 'BACKCHEST CLEAR', sessions: 5, branch: BACOOR_BRANCH, status: 'active', price: 25000 },
  { name: 'EXI FACE&NECK', sessions: 6, branch: BACOOR_BRANCH, status: 'active', price: 7500 },

  // Page 15
  { name: 'MILLIA REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1499 },
  { name: 'MOLE REMOVAL', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1499 },
  { name: 'NECK', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1499 },
  { name: 'FACE AND NECK', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2499 },
  { name: 'CHEST', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2499 },
  { name: 'BACK', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 2999 },
  { name: 'BRAZILIAN DIODE', sessions: 1, branch: BACOOR_BRANCH, status: 'active', price: 1999 },
]
