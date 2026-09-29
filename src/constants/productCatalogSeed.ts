/** Product catalog seed from Product List screenshots (Global branch, N/A category). */

export type ProductSeedRow = {
  name: string
  sku: string
  retailPrice: number
  baseCost: number
  branchName?: string
  categoryName?: string
  status?: 'active' | 'inactive'
}

export const PRODUCT_CATALOG_SEED: ProductSeedRow[] = [
  // PAGE 1
  { name: 'ACNE CREAM 10G', sku: 'ACN-1782744628', retailPrice: 350, baseCost: 350 },
  { name: 'ACNE SET', sku: 'ACN-1782744840', retailPrice: 1600, baseCost: 1600 },
  {
    name: 'ANTI INFLAMMATORY (HYDROCORTISONE)',
    sku: 'ANT-1782744863',
    retailPrice: 250,
    baseCost: 250,
  },
  { name: 'ANTI MELASMA SERUM', sku: 'ANT-1782744875', retailPrice: 1500, baseCost: 1500 },
  { name: 'CLARIFYING TONER', sku: 'CLA-1782744616', retailPrice: 500, baseCost: 500 },
  { name: 'CRYSTAL SOAP 75ML', sku: 'CRY-1782744654', retailPrice: 300, baseCost: 300 },
  { name: 'DEO SPRAY 60ML', sku: 'DEO-1782744604', retailPrice: 300, baseCost: 300 },
  { name: 'GLUTA LIQUID SOAP 30ML', sku: 'GLU-1782744630', retailPrice: 200, baseCost: 200 },
  { name: 'GUAVA SERUM', sku: 'GUA-1782744887', retailPrice: 800, baseCost: 800 },
  { name: 'MELA CREAM 10G', sku: 'MEL-1782744738', retailPrice: 350, baseCost: 350 },
  // PAGE 2
  { name: 'MELA DERM 10G', sku: 'MEL-1782744949', retailPrice: 200, baseCost: 200 },
  { name: 'MELA SET', sku: 'MEL-1782744899', retailPrice: 1600, baseCost: 1600 },
  { name: 'MELANOX 60ML', sku: 'MEL-1782745094', retailPrice: 500, baseCost: 500 },
  { name: 'MELANOX SOAP', sku: 'MEL-1782745106', retailPrice: 300, baseCost: 300 },
  { name: 'MOISTURIZER CREAM', sku: 'MOI-1782744851', retailPrice: 500, baseCost: 500 },
  { name: 'MULTI VITAMIN SERUM', sku: 'MUL-1782744911', retailPrice: 800, baseCost: 800 },
  { name: 'NIGHT CREAM', sku: 'NIG-1782744923', retailPrice: 500, baseCost: 500 },
  { name: 'NOURISHING TONER', sku: 'NOU-1782744678', retailPrice: 500, baseCost: 500 },
  { name: 'NUDE SOAP', sku: 'NUD-1782744690', retailPrice: 200, baseCost: 200 },
  { name: 'NUDE TONER', sku: 'NUD-1782744702', retailPrice: 500, baseCost: 500 },
  // PAGE 3
  { name: 'OATMEAL SOAP', sku: 'OAT-1782744902', retailPrice: 200, baseCost: 200 },
  { name: 'QUICK DRY TONER 60ML', sku: 'QUI-1782744666', retailPrice: 500, baseCost: 500 },
  { name: 'SUNBLOCK', sku: 'SUN-1782744816', retailPrice: 200, baseCost: 200 },
  { name: 'SUNSCREEN GEL', sku: 'SUN-1782745070', retailPrice: 600, baseCost: 600 },
  { name: 'SUNSCREEN MIST', sku: 'SUN-1782745058', retailPrice: 500, baseCost: 500 },
  { name: 'TEA TREE LIQUID SOAP 60ML', sku: 'TEA-1782744642', retailPrice: 350, baseCost: 350 },
  { name: 'TEA TREE LIQUID SOAP 75ML', sku: 'TEA-1782745123', retailPrice: 500, baseCost: 500 },
  { name: 'TINTED SUNBLOCK 10G', sku: 'TIN-1782744935', retailPrice: 200, baseCost: 200 },
  { name: 'TINTED SUNSCREEN', sku: 'TIN-1782745082', retailPrice: 600, baseCost: 600 },
  { name: 'UNDERARM CREAM 10G', sku: 'UND-1782785589', retailPrice: 250, baseCost: 250 },
]
