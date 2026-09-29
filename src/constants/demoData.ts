import type {
  Appointment,
  Branch,
  Client,
  ClientPackage,
  ClientSkinProfile,
  Commission,
  DashboardKpis,
  InventoryItem,
  MarketingCampaign,
  Package,
  PayrollItem,
  Sale,
  Staff,
  Treatment,
} from '@/types'

/** Placeholder business data removed for Supabase launch — lists start empty. */
export const demoBranches: Branch[] = []
export const demoTreatments: Treatment[] = []
export const demoPackages: Package[] = []
export const demoStaff: Staff[] = []
export const demoClients: Client[] = []
export const demoSkinProfiles: Record<string, ClientSkinProfile> = {}
export const demoClientPackages: ClientPackage[] = []
export const demoAppointments: Appointment[] = []
export const demoInventory: InventoryItem[] = []
export const demoMovements: {
  id: string
  itemId: string
  itemName?: string
  type: string
  quantity: number
  branchId: string
  createdAt: string
  note?: string
}[] = []
export const demoSales: Sale[] = []
export const demoPayroll: PayrollItem[] = []
export const demoCommissions: Commission[] = []
export const demoCampaigns: MarketingCampaign[] = []

export const demoDashboardKpis: DashboardKpis = {
  totalRevenue: 0,
  totalClients: 0,
  totalAppointments: 0,
  treatmentSales: 0,
  packageSales: 0,
  newClients: 0,
  revenueChange: 0,
  clientsChange: 0,
  appointmentsChange: 0,
  treatmentSalesChange: 0,
  packageSalesChange: 0,
  newClientsChange: 0,
}

export const demoRevenueByMonth: {
  month: string
  treatment: number
  package: number
  product: number
  revenue: number
}[] = []

export const demoClientGrowth: { month: string; newClients: number; returning: number }[] = []

export const demoSalesByBranch: { branch: string; revenue: number }[] = []

export const demoSystemSettings = {
  defaultCommissionRate: 0.05,
}
