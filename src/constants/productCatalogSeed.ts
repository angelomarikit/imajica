/** Product catalog seed — IMAJICA PRODUCT & SERVICES LIST 2026 (replace). */

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
  { name: 'ACNE SET', sku: 'ACN-1001', retailPrice: 1500, baseCost: 1500, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'WHITENING SERUM 15ML', sku: 'WHI-1002', retailPrice: 300, baseCost: 300, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'ACNE CREAM 10G', sku: 'ACN-1003', retailPrice: 350, baseCost: 350, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'TEA TREE LIQUID SOAP 60ML', sku: 'TEA-1004', retailPrice: 350, baseCost: 350, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'QUICK DRY TONER 60ML', sku: 'QUI-1005', retailPrice: 500, baseCost: 500, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'UNDERARM SET', sku: 'UND-1006', retailPrice: 1500, baseCost: 1500, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'DEO SPRAY 60ML', sku: 'DEO-1007', retailPrice: 500, baseCost: 500, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'UNDERARM TONER', sku: 'UND-1008', retailPrice: 450, baseCost: 450, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'GLUTA LIQUID SOAP 30ML', sku: 'GLU-1009', retailPrice: 300, baseCost: 300, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'UNDERARM CREAM 10G', sku: 'UND-1010', retailPrice: 250, baseCost: 250, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'WHITENING SET', sku: 'WHI-1011', retailPrice: 1500, baseCost: 1500, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'CLARIFYING TONER', sku: 'CLA-1012', retailPrice: 350, baseCost: 350, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'WHITENING TONER', sku: 'WHI-1013', retailPrice: 350, baseCost: 350, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'SUNBLOCK', sku: 'SUN-1014', retailPrice: 200, baseCost: 200, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'NIGHT CREAM (3)', sku: 'NIG-1015', retailPrice: 200, baseCost: 200, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'NIGHT CREAM (4)', sku: 'NIG-1016', retailPrice: 200, baseCost: 200, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'MOISTURIZING SOAP', sku: 'MOI-1017', retailPrice: 200, baseCost: 200, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'MELASMA SET', sku: 'MEL-1018', retailPrice: 1500, baseCost: 1500, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'MELA TONER 60ML', sku: 'MEL-1019', retailPrice: 400, baseCost: 400, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'OATMEAL SOAP', sku: 'OAT-1020', retailPrice: 200, baseCost: 200, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'MELA SERUM 20ML', sku: 'MEL-1021', retailPrice: 300, baseCost: 300, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'MELA CREAM 10G', sku: 'MEL-1022', retailPrice: 200, baseCost: 200, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'TINTED SUNBLOCK 10G', sku: 'TIN-1023', retailPrice: 200, baseCost: 200, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'MELA DERM 10G', sku: 'MEL-1024', retailPrice: 200, baseCost: 200, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'GUAVA SERUM', sku: 'GUA-1025', retailPrice: 600, baseCost: 600, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'NIACINAMIDE SERUM', sku: 'NIA-1026', retailPrice: 600, baseCost: 600, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'VITAMIN C', sku: 'VIT-1027', retailPrice: 600, baseCost: 600, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'UNDERARM SERUM', sku: 'UND-1028', retailPrice: 600, baseCost: 600, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'ANTI MELASMA SERUM', sku: 'ANT-1029', retailPrice: 600, baseCost: 600, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'SUNSCREEN MIST', sku: 'SUN-1030', retailPrice: 500, baseCost: 500, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'SUNSCREEN GEL', sku: 'SUN-1031', retailPrice: 600, baseCost: 600, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'TINTED SUNCREEN', sku: 'TIN-1032', retailPrice: 600, baseCost: 600, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'NIACINAMIDE CLEANSER 75ML', sku: 'NIA-1033', retailPrice: 500, baseCost: 500, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'CRYSTAL SOAP 75ML', sku: 'CRY-1034', retailPrice: 500, baseCost: 500, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'TEA TREE LIQUID SOAP 75ML', sku: 'TEA-1035', retailPrice: 500, baseCost: 500, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'NIACINAMIDE TONER', sku: 'NIA-1036', retailPrice: 350, baseCost: 350, branchName: 'Global', categoryName: 'N/A', status: 'active' },
  { name: 'ANTI INFLAMMATORY (HYDROCORTISONE)', sku: 'ANT-1037', retailPrice: 500, baseCost: 500, branchName: 'Global', categoryName: 'N/A', status: 'active' },
]
