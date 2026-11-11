/** Package catalog seed — IMAJICA PRODUCT & SERVICES LIST 2026 (replace, all clinics). */

export type PackageSeedRow = {
  name: string
  sessions: number
  branch: 'San Mateo, Rizal' | 'Cainta, Rizal' | 'Pasig City' | 'Warehouse' | 'Lipa, Batangas' | 'Dasmariñas, Cavite' | 'Bacoor, Cavite' | ''
  status: 'active' | 'inactive'
  price: number
  /** Spreadsheet FREE ITEMS / SERVICE INCLUDED text */
  freeItems?: string
  /** Matched SERVICE_CATALOG_SEED indexes (0-based) for includedTreatmentIds */
  includedServiceIndexes?: number[]
}

export const PACKAGE_CATALOG_SEED: PackageSeedRow[] = [
  { name: 'CROWNING GLORY', sessions: 8, branch: '', status: 'active', price: 35000, freeItems: 'DHT BLOCKER TREATMENT (2 SESSIONS) + HAIR GROWTH (6 SESSION)', includedServiceIndexes: [] },
  { name: 'SELF LOVE GLOW UP', sessions: 1, branch: '', status: 'active', price: 12500, freeItems: '1 AQUA FACIAL + 1 MULTIVITAMIN DRIP + 1 EMSLIM + 1 EXIPRO + 1 DIODE HAIR REMOVAL + 1 LEMON BOTTLE', includedServiceIndexes: [5, 38, 51, 39, 50] },
  { name: 'ULTRA FORMER 12D HIFU', sessions: 1, branch: '', status: 'active', price: 10000, freeItems: '1 MESOLIPO FACE + 1 HYDRAFACIAL + 1 MPT W/ COLLAGEN BOOSTER', includedServiceIndexes: [2] },
  { name: 'MESOSLIM FACE CONTOUR', sessions: 5, branch: '', status: 'active', price: 15000, freeItems: '5 MESOLIPO FACE (5ML) + 5 EXIPRO + 5 EMSLIM', includedServiceIndexes: [39, 51] },
  { name: 'MESOSLIM ARMS CONTOUR', sessions: 5, branch: '', status: 'active', price: 15000, freeItems: '5 MESOLIPO ARMS (5ML) + 5 EXIPRO + 5 EMSLIM', includedServiceIndexes: [39, 51] },
  { name: 'MESOSLIM SEXY BACK CONTOUR', sessions: 5, branch: '', status: 'active', price: 16000, freeItems: '5 MESOLIPO BACK (5ML) + 5 EXIPRO + 5 EMSLIM', includedServiceIndexes: [39, 51] },
  { name: 'MESOSLIM LOVE HANDLE CONTOUR', sessions: 5, branch: '', status: 'active', price: 16000, freeItems: '5 MESOLIPO LOVE HANDLE (5ML) + 5 EXIPRO + 5 EMSLIM', includedServiceIndexes: [55, 39, 51] },
  { name: 'MESOSLIM TUMMY CONTOUR', sessions: 5, branch: '', status: 'active', price: 16000, freeItems: '5 MESOLIPO TUMMY (5ML) + 5 EXIPRO + 5 EMSLIM', includedServiceIndexes: [39, 51] },
  { name: 'MESOSLIM LEGS CONTOUR', sessions: 5, branch: '', status: 'active', price: 16000, freeItems: '5 MESOLIPO LEGS (5ML) + 5 EXIPRO + 5 EMSLIM', includedServiceIndexes: [39, 51] },
  { name: 'LEMON BOTTLE', sessions: 3, branch: '', status: 'active', price: 15000, freeItems: '3 LEMON BOTTLE + 5 EXIPRO + 5 EMSLIM', includedServiceIndexes: [50, 39, 51] },
  { name: 'IMAJICA SLIM GLP1', sessions: 4, branch: '', status: 'active', price: 30000, freeItems: '4 GLP1 + 4 EMSLIM + 4 EXIPRO', includedServiceIndexes: [51, 39] },
  { name: 'IMMUNITY DRIP 5+1', sessions: 6, branch: '', status: 'active', price: 10000, freeItems: '6 DRIP + 1 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'IMMUNITY DRIP 10+4', sessions: 14, branch: '', status: 'active', price: 20000, freeItems: '14 DRIP + 2 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'IMMUNITY DRIP 15+6', sessions: 21, branch: '', status: 'active', price: 30000, freeItems: '21 DRIP + 3 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'IMMUNITY DRIP 25+10', sessions: 35, branch: '', status: 'active', price: 50000, freeItems: '35 DRIP + 4 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'SLENDER DRIP 5+1', sessions: 6, branch: '', status: 'active', price: 10000, freeItems: '6 DRIP + 1 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'SLENDER DRIP 10+4', sessions: 14, branch: '', status: 'active', price: 20000, freeItems: '14 DRIP + 2 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'SLENDER DRIP 15+6', sessions: 21, branch: '', status: 'active', price: 30000, freeItems: '21 DRIP + 3 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'SLENDER DRIP 25+10', sessions: 35, branch: '', status: 'active', price: 50000, freeItems: '35 DRIP + 4 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'AGE REVERSING DRIP 5+1', sessions: 6, branch: '', status: 'active', price: 10000, freeItems: '6 DRIP + 1 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'AGE REVERSING DRIP 10+4', sessions: 14, branch: '', status: 'active', price: 20000, freeItems: '14 DRIP + 2 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'AGE REVERSING DRIP 15+6', sessions: 21, branch: '', status: 'active', price: 30000, freeItems: '21 DRIP + 3 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'AGE REVERSING DRIP 25+10', sessions: 35, branch: '', status: 'active', price: 50000, freeItems: '35 DRIP + 4 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'MULTIVITAMIN DRIP 5+1', sessions: 6, branch: '', status: 'active', price: 12500, freeItems: '6 DRIP + 1 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'MULTIVITAMIN DRIP 10+5', sessions: 15, branch: '', status: 'active', price: 25000, freeItems: '15 DRIP + 2 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'MULTIVITAMIN DRIP 15+9', sessions: 24, branch: '', status: 'active', price: 37500, freeItems: '24 DRIP + 3 FREE FACIAL', includedServiceIndexes: [36, 0] },
  { name: 'MULTIVITAMIN DRIP 20+15', sessions: 35, branch: '', status: 'active', price: 50000, freeItems: '35 DRIP + 4 FACIAL', includedServiceIndexes: [36, 0] },
]
