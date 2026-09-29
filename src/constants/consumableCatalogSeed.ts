/** Consumables catalog seed from Consumables list screenshots. */

export type ConsumableSeedRow = {
  name: string
  stock: number
  price?: number
  branchName?: string
  /** ISO date yyyy-mm-dd */
  createdAt?: string
  reorderLevel?: number
}

const D = '2026-06-29'
const D2 = '2026-07-04'
const D3 = '2026-06-30'

export const CONSUMABLE_CATALOG_SEED: ConsumableSeedRow[] = [
  // PAGE 1
  { name: '10CC SYRINGE 100PCS/BOX', stock: 201, createdAt: D },
  { name: '1CC SYRINGE 100PCS/BOX', stock: 802, createdAt: D },
  { name: '1G SHANGRI-LA HUMIDIFIER', stock: 1, createdAt: D },
  { name: '1G SOLAIRE HUMIDIFIER', stock: 0, createdAt: D },
  { name: '1L GREEN TEA', stock: 1, createdAt: D },
  { name: '32G NEEDLE 100PCS/BOX', stock: 2, createdAt: D },
  { name: '34G NEEDLE 100PCS/BOX', stock: 0, createdAt: D },
  { name: '42 PIN MICRONEEDLING 10PCS/SET', stock: 4, createdAt: D },
  { name: '5CC NEEDLE 100PCS/BOX', stock: 0, createdAt: D },
  { name: 'ACNE CREAM 500G', stock: 0, createdAt: D },
  { name: 'ALCOHOL 1GALON', stock: 6, createdAt: D },
  { name: 'ALOEVERA GEL', stock: 0, createdAt: D },
  { name: 'AMBER GLASS BOTTLE', stock: 0, createdAt: D },
  { name: 'ANESTHETIC CREAM', stock: 0, createdAt: D },
  { name: 'ANTI MELASMA SERUM 1L', stock: 0, createdAt: D },
  // PAGE 2
  { name: 'ASCE', stock: 0, createdAt: D },
  { name: 'BB BLUSH', stock: 2, createdAt: D },
  { name: 'BB FOUNDATION ( MESO WHITE )', stock: 0, createdAt: D },
  { name: 'BED SHEET (WHITE)', stock: 0, createdAt: D },
  { name: 'BIO SKIN STEM CELL', stock: 0, createdAt: D2 },
  { name: 'BIOAQUA FACIAL MASK SHEET', stock: 80, createdAt: D },
  { name: 'BIOSKIN (COLLAGEN DRIP)', stock: 0, createdAt: D },
  { name: 'BLEACHING CREAM 500G', stock: 5, createdAt: D },
  { name: 'BLOOD COLLECTION (PLASMA)', stock: 3, createdAt: D },
  { name: 'BONTON SPRAY BOTTLE', stock: 150, createdAt: D },
  { name: 'BUTTERFLY NEEDLE', stock: 2, createdAt: D },
  { name: 'CANNULA 100PCS/BOX', stock: 0, createdAt: D },
  { name: 'CARBON GEL', stock: 0, createdAt: D },
  { name: 'CARBON GEL BRUSH', stock: 0, createdAt: D },
  { name: 'CARTINEX (L-CARNATINE)', stock: 0, createdAt: D },
  // PAGE 3
  { name: 'CAUTERY PIN 10PCS', stock: 0, createdAt: D },
  { name: 'CENTELLA MUD CREAM (8PCS/BOX)', stock: 4, createdAt: D },
  { name: 'CENTRIFUGE', stock: 0, createdAt: D },
  { name: 'CLEANSER BOTTLE', stock: 200, createdAt: D },
  { name: 'CLEAR SERUM BOTTLE', stock: 4, createdAt: D },
  { name: 'COTTON', stock: 15, createdAt: D },
  { name: 'ELECTRIC SHAVER', stock: 0, createdAt: D },
  { name: 'ERY+HYDROCORTISONE', stock: 0, createdAt: D },
  { name: 'ETHERIUM (JAPAN)', stock: 0, createdAt: D },
  { name: 'EXILIS PATCH', stock: 4, createdAt: D },
  { name: 'EYE DEAL', stock: 0, createdAt: D },
  { name: 'EYE MASK', stock: 6, createdAt: D },
  { name: 'FACE MASK (PER BOX)', stock: 0, createdAt: D },
  { name: 'FACIAL SCRUB 1L', stock: 4, createdAt: D },
  { name: 'FACIAL SOAP 1L', stock: 6, createdAt: D },
  // PAGE 4
  { name: 'GARTERIZED BODY TOWEL', stock: 0, createdAt: D },
  { name: 'GAUZE SWABS', stock: 0, createdAt: D },
  { name: 'GEL PUMP BOTTLE', stock: 100, createdAt: D },
  { name: 'GHK', stock: 0, createdAt: D2 },
  { name: 'GLOVES (M)', stock: 20, createdAt: D },
  { name: 'GLOVES (S)', stock: 20, createdAt: D },
  { name: 'GOLD POWDER MASK', stock: 0, createdAt: D },
  { name: 'GUAVA SERUM 1L', stock: 0, createdAt: D },
  { name: 'HEAD TOWEL', stock: 0, createdAt: D },
  { name: 'HEADBAND', stock: 0, createdAt: D },
  { name: 'HYRONT (MESO DNA)', stock: 0, createdAt: D },
  { name: 'INDEXCARD', stock: 10, createdAt: D },
  { name: 'KABELLINE', stock: 0, createdAt: D },
  { name: 'KANOLONE', stock: 0, createdAt: D },
  { name: 'LEMON BOTTLE', stock: 10, createdAt: D },
  // PAGE 5
  { name: 'NIACINAMIDE TONER 1L', stock: 0, createdAt: D },
  { name: 'PAPER BAG (MOST GREEN) 10PCS/SET', stock: 100, createdAt: D },
  { name: 'PAPER CUP', stock: 21, createdAt: D },
  { name: 'PINK GLOW', stock: 3, createdAt: D },
  { name: 'PLASTIC MASK', stock: 0, createdAt: D },
  { name: 'PNSS 100PCS/BOX', stock: 2, createdAt: D },
  { name: 'PRE-PEEL 500G', stock: 0, createdAt: D },
  { name: 'PRICKER', stock: 0, createdAt: D },
  { name: 'PURI-LIPS', stock: 0, createdAt: D2 },
  { name: 'RECEIPT', stock: 0, createdAt: D },
  { name: 'RED CELL', stock: 2, createdAt: D },
  { name: 'REJURAN', stock: 0, createdAt: D },
  { name: 'REJUVIA', stock: 0, createdAt: D2 },
  { name: 'RENTOX', stock: 8, createdAt: D },
  { name: 'ROUND NANO 10PCS/SET', stock: 0, createdAt: D },
  // PAGE 6
  { name: 'SEAT COVER (GREEN)', stock: 0, createdAt: D },
  { name: 'SEAWEED PEEL-OFF MASK 500G', stock: 0, createdAt: D },
  { name: 'SHIRAYUKI', stock: 0, createdAt: D },
  { name: 'SOFT BLANKET (GREEN)', stock: 0, createdAt: D },
  { name: 'SPANISH PEEL 100ML', stock: 0, createdAt: D },
  { name: 'SPATULA', stock: 0, createdAt: D },
  { name: 'SPONGE', stock: 120, createdAt: D },
  { name: 'SPONGE PINK / VIOLET', stock: 60, createdAt: D },
  { name: 'SPRAY BOTTLE FOR ALCOHOL', stock: 0, createdAt: D },
  { name: 'STEAMER', stock: 1, createdAt: D },
  { name: 'STOOL CHAIR', stock: 0, createdAt: D },
  { name: 'SUNSCREEN GEL 1L', stock: 0, createdAt: D },
  { name: 'SUNSCREEN MIST 1L', stock: 0, createdAt: D },
  { name: 'SUREGUARD NEEDLE G30 (HYPODERMIC)', stock: 7, createdAt: D },
  { name: 'TAPE MEASURE', stock: 0, createdAt: D },
  // PAGE 7
  { name: 'TCA CHEMICAL PEELING', stock: 0, createdAt: D },
  { name: 'TEA TREE CLEANSER 1L', stock: 10, createdAt: D },
  { name: 'TESTING CONSUMABLE', stock: 0, price: 250, createdAt: D3 },
  { name: 'TISSUE', stock: 62, createdAt: D },
  { name: 'TRASHBAG LARGE', stock: 15, createdAt: D },
  { name: 'UA SWEATING SOLUTION TO 500ML', stock: 0, createdAt: D },
  // PAGE 8
  { name: 'UNDERARM SERUM 1L', stock: 0, createdAt: D },
  { name: 'UV STERILIZER DISINFECTION CABINET', stock: 0, createdAt: D },
  { name: 'VACUUM GLASS', stock: 5, createdAt: D },
  { name: 'VAMPIRE POWDER MASK', stock: 0, createdAt: D },
  { name: 'VITAMIN C (DRIP)', stock: 0, createdAt: D },
  { name: 'VITAMIN C SERUM 1L', stock: 0, createdAt: D },
  { name: 'WHITE THIN BRUSH', stock: 40, createdAt: D },
  { name: 'WHITENING SCRUB', stock: 0, createdAt: D },
  { name: 'WIPES', stock: 5, createdAt: D },
]
