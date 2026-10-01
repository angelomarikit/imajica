export type UserRole =
  | 'SUPER_ADMIN'
  | 'HQ_ADMIN'
  | 'BRANCH_ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'AESTHETICIAN'
  | 'RECEPTIONIST'
  | 'STAFF'
  | 'CLIENT'

export type EntityStatus = 'active' | 'inactive'

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod =
  | 'cash'
  | 'paymongo'
  | 'bank_transfer'
  | 'gcash'
  | 'paymaya'
  | 'credit_card'
  | 'debit_card'
  | 'qr_ph'
  | 'owners_account'
  | 'other'

export type InventoryMovementType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'TRANSFER'
  | 'ADJUSTMENT'
  | 'TREATMENT_USAGE'
  | 'EXPIRED'
  | 'DAMAGED'

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued'

export type PayrollStatus = 'draft' | 'for_review' | 'approved' | 'processed' | 'paid'

export type PackageType = 'package' | 'membership' | 'promo'

export type TreatmentCategorySlug =
  | 'facial'
  | 'skin'
  | 'body'
  | 'injectables'
  | 'wellness'
  | 'laser'
  | 'others'

export interface User {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
  phone?: string
  roles: UserRole[]
  preferredBranchId?: string
}

export interface Branch {
  id: string
  name: string
  code: string
  /** company_owned | franchise | warehouse */
  branchType?: 'company_owned' | 'franchise' | 'warehouse'
  address: string
  phone: string
  email: string
  managerName?: string
  status: EntityStatus
  isMain: boolean
  imageUrl?: string
  treatmentRooms: number
  consultationRooms: number
  waitingAreas: number
  parkingAvailable: boolean
  staffCount: number
}

export interface BranchHours {
  id: string
  branchId: string
  dayOfWeek: number
  isOpen: boolean
  openTime: string
  closeTime: string
}

export interface Client {
  id: string
  code: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: 'female' | 'male' | 'prefer_not_to_say'
  address?: string
  occupation?: string
  middleName?: string
  preferredBranchId: string
  preferredBranchName: string
  status: EntityStatus
  isVip: boolean
  avatarUrl?: string
  registeredAt: string
  /** Latest sale / avail timestamp (ISO) — Customer Registry sorts by this desc */
  lastPurchaseAt?: string
  /** Latest sale id for stable tie-break when timestamps match */
  lastSaleId?: string
  /** Availed package/service session slots (catalog-derived) */
  sessionsCount?: number
  totalVisits: number
  totalSpent: number
  /** Loyalty / referral reward points balance */
  rewardPoints?: number
  membershipLabel?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  medicalConcerns?: string
  currentMedications?: string
  adminNotes?: string
}

export interface ClientSkinProfile {
  clientId: string
  skinType: string
  concerns: string[]
  allergies: string
  medicalConditions: string
  contraindications?: string
}

export interface Staff {
  id: string
  code: string
  fullName: string
  email: string
  phone: string
  role: UserRole
  title: string
  department?: string
  branchId: string
  branchName: string
  status: 'active' | 'on_leave' | 'inactive'
  avatarUrl?: string
  specializations: string[]
  hireDate: string
  employmentType: string
  rating: number
  reviewCount: number
  baseSalary: number
  birthDate?: string
  address?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
}

export interface StaffPosition {
  id: string
  name: string
  code: string
  department: string
  description?: string
  defaultCommissionRate: number
  status: 'active' | 'inactive'
}

/** Team → User Access directory row (profiles + user_roles) */
export interface AccessUser {
  id: string
  fullName: string
  email: string
  role: string
  branchId: string | null
  branchName: string | null
  status: 'active' | 'inactive'
  /** Shared kiosk Time In / Out number (e.g. 023) */
  employeeCode?: string | null
}

export interface Treatment {
  id: string
  name: string
  category: TreatmentCategorySlug
  description: string
  durationMinutes: number
  price: number
  status: EntityStatus
  imageUrl?: string
  benefits: string[]
  procedureInfo?: string
  commissionRate?: number
  popularity: number
  /** Catalog / Service Management fields */
  sessions?: number
  branchId?: string
  branchName?: string
  /** Available at every branch (overrides / ignores availableBranchIds for listing) */
  availableGlobally?: boolean
  /** Branch ids where this service is offered when not global */
  availableBranchIds?: string[]
}

export interface Package {
  id: string
  name: string
  type: PackageType
  description: string
  regularPrice: number
  promoPrice?: number
  sessions: number
  validityMonths: number
  status: EntityStatus
  imageUrl?: string
  memberCount: number
  includedTreatmentIds: string[]
  /** Catalog / Package Management fields */
  branchId?: string
  branchName?: string
  freeItems?: string
  availableGlobally?: boolean
  availableBranchIds?: string[]
}

export interface ClientPackage {
  id: string
  clientId: string
  packageId: string
  packageName: string
  sessionsTotal: number
  sessionsUsed: number
  validUntil: string
  status: EntityStatus
}

export interface Appointment {
  id: string
  clientId: string
  clientName: string
  clientPhone?: string
  clientEmail?: string
  branchId: string
  branchName: string
  treatmentId: string
  treatmentName: string
  treatmentName2?: string
  staffId?: string
  staffName?: string
  roomId?: string
  startAt: string
  endAt: string
  durationMinutes: number
  status: AppointmentStatus
  /** Card badge: New / Pending / Paid */
  clientStatus?: string
  bookingDate?: string
  clinic?: string
  campaignPromo?: string
  promoCode?: string
  downPayment?: number
  leadSource?: string
  notes?: string
  price: number
  imageUrl?: string
}

export interface InventoryItem {
  id: string
  name: string
  brand?: string
  sku: string
  category: string
  branchId: string
  currentStock: number
  reorderLevel: number
  unitCost: number
  sellingPrice: number
  status: StockStatus
  imageUrl?: string
  expirationDate?: string
}

/** Catalog → Products → category taxonomy */
export interface ProductCategory {
  id: string
  name: string
  subtitle?: string
  createdAt: string
}

/** Catalog → Products → Inventory (retail / clinic products) */
export interface CatalogProduct {
  id: string
  name: string
  sku: string
  categoryId?: string
  categoryName?: string
  supplier?: string
  branchId?: string
  branchName: string
  retailPrice: number
  baseCost: number
  status: EntityStatus
  manufacturingDate?: string
  expirationDate?: string
  removalDate?: string
  createdAt: string
}

/** Per-branch stock row for a catalog product */
export interface ProductBranchStock {
  branchId: string
  branchName: string
  stock: number
  restockPoint: number
}

/** Stock movement history entry (View / Stock History modal) */
export interface ProductStockHistoryEntry {
  id: string
  productId: string
  branchId?: string
  branchName?: string
  createdAt: string
  previousQty: number
  newQty: number
  adjustment: number
  movementType: string
  reference?: string
  notes?: string
}

/** Catalog → Products → Consumables (clinic supplies) */
export interface ConsumableItem {
  id: string
  name: string
  stock: number
  reorderLevel: number
  price: number
  branchId?: string
  branchName: string
  createdAt: string
}

/** Administration → Operations → Central Warehouse */
export type WarehouseItemType = 'product' | 'consumable'

export interface WarehouseStockMovement {
  id: string
  itemId: string
  delta: number
  note?: string
  createdAt: string
}

export interface WarehouseItem {
  id: string
  itemType: WarehouseItemType
  name: string
  unitType?: string
  warehouseStock: number
  acquisitionPrice: number
  createdAt: string
}

/** Administration → Operations → Stock Transfers (Branch Transfers) */
export type StockTransferItemType = 'product' | 'consumable'

export interface StockTransfer {
  id: string
  transferDate: string
  itemType: StockTransferItemType
  itemId: string
  itemName: string
  sourceBranchId: string
  sourceBranchName: string
  targetBranchId: string
  targetBranchName: string
  quantity: number
  performedBy: string
  remarks?: string
  createdAt: string
}

export interface Sale {
  id: string
  invoiceNumber: string
  clientId: string
  clientName: string
  branchId: string
  branchName: string
  staffId?: string
  staffName?: string
  doctorId?: string
  doctorName?: string
  treatmentOrPackage: string
  /** Analytics / booking line classification */
  itemType?: 'service' | 'package' | 'product'
  /** Full Payment | Installment | Installment (Downpayment) | Installment Payment | Split Payment | Partial */
  paymentType?: string
  bookingRef?: string
  sku?: string
  quantity?: number
  unitBaseCost?: number
  unitRetailPrice?: number
  leadSource?: string
  isFirstClientSale?: boolean
  referredByClientId?: string
  referredByName?: string
  totalAmount: number
  paymentMethod: PaymentMethod
  status: PaymentStatus
  createdAt: string
  /** Import grouping key (customer + item + branch + episode date) */
  episodeKey?: string
}

export type AnalyticsSaleType = 'service' | 'package' | 'product'

export interface ProductSalesRow {
  productName: string
  sku: string
  unitsSold: number
  baseCost: number
  retailPrice: number
  totalRevenue: number
  totalCost: number
  totalProfit: number
  profitMargin: number
}

export interface TreatmentSalesRow {
  rank: number
  treatmentName: string
  type: 'Service' | 'Package'
  totalBooked: number
  totalRevenue: number
}

export interface NewClientSaleRow {
  firstBookingDate: string
  customerName: string
  bookingRef: string
  availed: string
  leadSource: string
  staffName: string
  amountPaid: number
  paymentType: string
  status: string
  branchName: string
}

/** Administration → Operations → Branch Orders */
export interface BranchOrderItem {
  id: string
  itemNo: number
  category: string
  unitType: string
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface BranchOrder {
  id: string
  invoiceNumber: string
  orderDate: string
  branchId?: string
  branchName: string
  phone?: string
  contactPerson: string
  supplier: string
  itemCount: number
  subtotal: number
  shipping: number
  otherCharges: number
  totalAmount: number
  deductOnDailyCash: boolean
  status: 'draft' | 'submitted' | 'dispatched' | 'received' | 'cancelled'
  remarks?: string
  items: BranchOrderItem[]
  createdAt: string
}

/** Administration → Operations → Franchise Orders */
export type FranchiseOrderStatus =
  | 'pending'
  | 'approved'
  | 'dispatched'
  | 'completed'
  | 'cancelled'

export interface FranchiseOrder {
  id: string
  invoiceNumber: string
  orderDate: string
  franchiseBranch: string
  phone?: string
  contactPerson: string
  supplier: string
  itemCount: number
  subtotal: number
  shipping: number
  otherCharges: number
  totalAmount: number
  deductOnDailyCash: boolean
  status: FranchiseOrderStatus
  remarks?: string
  items: BranchOrderItem[]
  createdAt: string
}

/** Administration → Operations → Waste Inventory (expired products) */
export interface WasteInventoryItem {
  id: string
  productName: string
  category: string
  branchId?: string
  branchName: string
  basePrice: number
  expiryDate: string
  createdAt: string
}

export interface Commission {
  id: string
  staffId: string
  staffName: string
  sourceSaleId: string
  grossAmount: number
  rate: number
  amount: number
  status: 'pending' | 'approved' | 'paid'
  periodLabel: string
}

export interface PayrollItem {
  id: string
  staffId: string
  staffName: string
  role: UserRole
  branchName: string
  baseSalary: number
  commission: number
  incentives: number
  deductions: number
  totalPay: number
  netPay: number
  status: 'ready' | 'for_review' | 'paid'
  avatarUrl?: string
}

export type MarketingChannel = 'sms' | 'email' | 'SMS' | 'Email'

export type MarketingCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'partial'
  | 'failed'
  | 'active'
  | 'completed'

export interface MarketingCampaign {
  id: string
  name: string
  channel: MarketingChannel
  branchId?: string
  audience: string
  content?: string
  messageBody?: string
  senderName?: string
  recipientCount?: number
  creditsEstimated?: number
  creditsUsed?: number
  sentAt?: string
  errorMessage?: string
  status: MarketingCampaignStatus
  startDate: string
  endDate: string
  reach: number
  conversions: number
  revenue: number
  createdAt?: string
}

export type SmsRecipientStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'failed'
  | 'refunded'

export interface SmsCampaignRecipient {
  id: string
  campaignId: string
  clientId?: string
  phone: string
  semaphoreMessageId?: string
  status: SmsRecipientStatus | string
  network?: string
  error?: string
}

export interface SemaphoreAccountInfo {
  configured: boolean
  accountId?: number
  accountName?: string
  status?: string
  creditBalance: number
  error?: string
}

export interface SmsAudienceMember {
  clientId: string
  fullName: string
  phone: string
  branchId?: string
  branchName?: string
}

/** Landing page Special Offer card — controlled by Marketing admin */
export interface LandingPromo {
  id: string
  badge: string
  headline: string
  description: string
  ctaLabel: string
  /** Shown inside the cleaner promo modal */
  modalTitle: string
  modalBody: string
  highlights: string[]
  validUntil?: string
  discountLabel?: string
  isActive: boolean
  updatedAt: string
}

/** Catalog → Promotions → coupons */
export type CouponDiscountType = 'fixed' | 'percentage'

export interface PromoCoupon {
  id: string
  code: string
  name: string
  description?: string
  discountType: CouponDiscountType
  discountValue: number
  serviceId?: string
  serviceName?: string
  packageId?: string
  packageName?: string
  branchId?: string
  branchName: string
  validFrom: string
  validUntil: string
  newCustomersOnly: boolean
  createdAt: string
}

/** Administration → Operations → Expenses */
export type ExpenseScope = 'branch' | 'ops'
export type ExpenseType = 'manual' | 'automatic'

export interface OperationalExpense {
  id: string
  name: string
  category: string
  department?: string
  amount: number
  type: ExpenseType
  deductCash: boolean
  status: EntityStatus
  scope: ExpenseScope
  expenseDate: string
  createdAt: string
  branchId?: string
  branchName?: string
  notes?: string
}

export interface NotificationItem {
  id: string
  title: string
  body: string
  read: boolean
  createdAt: string
  type: string
}

export interface DashboardKpis {
  totalRevenue: number
  totalClients: number
  totalAppointments: number
  treatmentSales: number
  packageSales: number
  newClients: number
  revenueChange: number
  clientsChange: number
  appointmentsChange: number
  treatmentSalesChange: number
  packageSalesChange: number
  newClientsChange: number
}

export interface AuthSessionUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  avatarUrl?: string
  branchId?: string
  /** When set from user_roles → branches */
  branchType?: 'company_owned' | 'franchise' | 'warehouse'
  branchName?: string
}

export type AttendancePunchType = 'time_in' | 'time_out'

export interface AttendancePunch {
  id: string
  userId: string
  branchId: string
  punchType: AttendancePunchType
  punchedAt: string
  photoUrl: string | null
  latitude: number | null
  longitude: number | null
  accuracyM: number | null
  /** Street / place name from reverse geocode */
  locationLabel: string | null
  createdAt: string
}
