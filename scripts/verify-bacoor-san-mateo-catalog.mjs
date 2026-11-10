import fs from 'fs'

function extract(filePath, branch) {
  const text = fs.readFileSync(filePath, 'utf8')
  const rows = []
  const re = new RegExp(
    `\\{\\s*name:\\s*'((?:\\\\'|[^'])*)'\\s*,\\s*sessions:\\s*(\\d+)\\s*,\\s*branch:\\s*'${branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\s*,\\s*status:\\s*'(active|inactive)'\\s*,\\s*price:\\s*(\\d+)\\s*\\}`,
    'g',
  )
  let m
  while ((m = re.exec(text))) {
    rows.push({
      name: m[1].replace(/\\'/g, "'"),
      sessions: Number(m[2]),
      status: m[3],
      price: Number(m[4]),
    })
  }
  return rows
}

const sm = extract('src/constants/serviceCatalogSeed.ts', 'San Mateo, Rizal')
const bacoorFile = fs.readFileSync('src/constants/bacoorServiceCatalogSeed.ts', 'utf8')
const derived = bacoorFile.includes("SERVICE_CATALOG_SEED.filter")

const smPkgs = extract('src/constants/packageCatalogSeed.ts', 'San Mateo, Rizal')
const bcPkgs = extract('src/constants/packageCatalogSeed.ts', 'Bacoor, Cavite')

const key = (r) => `${r.name}|${r.sessions}|${r.price}|${r.status}`
const smSet = new Set(sm.map(key))
const bcPkgSet = new Set(bcPkgs.map(key))
const smPkgSet = new Set(smPkgs.map(key))

const missingPkgs = smPkgs.filter((r) => !bcPkgSet.has(key(r)))
const migration = fs.readFileSync(
  'supabase/migrations/20261110000103_bacoor_match_san_mateo_catalog.sql',
  'utf8',
)

console.log(
  JSON.stringify(
    {
      bacoorSeedDerivedFromSanMateo: derived,
      sanMateoServices: sm.length,
      sanMateoPackages: smPkgs.length,
      bacoorPackages: bcPkgs.length,
      packageCloneComplete: missingPkgs.length === 0,
      missingPackages: missingPkgs.slice(0, 5),
      migrationHasServices: migration.includes('MULTIVITAMIN DRIP 5+1'),
      migrationHasBacoorUuid: migration.includes('22222222-2222-2222-2222-222222222206'),
      migrationHasDeactivate: migration.includes("status = 'inactive'"),
    },
    null,
    2,
  ),
)
