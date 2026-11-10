/**
 * Imajica Bacoor franchise service menu — aligned 1:1 with San Mateo
 * (same name, sessions, price, status). Kept as a sealed branch menu via
 * `branchUsesOwnServiceMenu` so franchise booking stays simple.
 */
import { SERVICE_CATALOG_SEED, type ServiceSeedRow } from '@/constants/serviceCatalogSeed'

export const BACOOR_BRANCH = 'Bacoor, Cavite' as const

/** Clone of every San Mateo catalog row, labeled for Bacoor. */
export const BACOOR_SERVICE_CATALOG_SEED: ServiceSeedRow[] = SERVICE_CATALOG_SEED.filter(
  (row) => row.branch === 'San Mateo, Rizal',
).map((row) => ({
  ...row,
  branch: BACOOR_BRANCH,
}))
