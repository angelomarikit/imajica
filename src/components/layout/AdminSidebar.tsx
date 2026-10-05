import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserPlus,
  Package,
  Boxes,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  User,
  Wallet,
  Megaphone,
  Settings,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  List,
  LayoutGrid,
  FlaskConical,
  ArrowLeftRight,
  ClipboardList,
  FileText,
  Receipt,
  ShoppingBasket,
  TriangleAlert,
  PieChart,
  Activity,
  GraduationCap,
  ShieldCheck,
  Map,
  Store,
  BarChart3,
  Box,
  KeyRound,
  Clock,
  Award,
  Banknote,
  Target,
  CalendarOff,
  HandCoins,
  UserMinus,
  Briefcase,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import logo from '@/assets/logo-imajica.jpg'
import { BRAND } from '@/constants/brand'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'
import { isFranchiseBranchOwner, isHrRole, isTimeclockStaff } from '@/utils/franchiseAccess'
import { Button } from '@/components/ui/Button'
import { MobileDrawer } from '@/components/ui/MobileDrawer'
import { useBranch } from '@/contexts/BranchContext'
import type { Branch } from '@/types'

type NavLeaf = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** Exact match only (e.g. list pages that share prefix with /new) */
  end?: boolean
}

type NavGroup = {
  label: string
  icon: ComponentType<{ className?: string }>
  children: NavNode[]
}

type NavNode = NavLeaf | NavGroup

type NavItem = {
  label: string
  icon: ComponentType<{ className?: string }>
  to?: string
  /** Exact match only (e.g. list pages that share prefix with /new) */
  end?: boolean
  children?: NavNode[]
  /** Trailing › like TEAM screenshot */
  trailingChevron?: boolean
}

type NavSection = {
  category?: string
  items: NavItem[]
}

function isNavGroup(node: NavNode): node is NavGroup {
  return 'children' in node && Array.isArray(node.children)
}

const hqNavSectionsBase: NavSection[] = [
  {
    items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    category: 'Scheduling',
    items: [
      { to: '/admin/appointments', label: 'Client Scheduling', icon: CalendarDays },
      { to: '/admin/booking', label: 'Booking', icon: ShoppingBag },
    ],
  },
  {
    category: 'Customers',
    items: [
      {
        label: 'Customers',
        icon: Users,
        children: [
          { to: '/admin/clients/new', label: 'New Customer', icon: UserPlus },
          { to: '/admin/clients', label: 'Customer List', icon: Users, end: true },
        ],
      },
    ],
  },
  {
    category: 'Catalog',
    items: [
      {
        label: 'Services & Packages',
        icon: Plus,
        children: [
          { to: '/admin/catalog/services/new', label: 'New Service', icon: Plus },
          { to: '/admin/catalog/services', label: 'Services List', icon: List, end: true },
          { to: '/admin/catalog/packages/new', label: 'New Package', icon: Package },
          {
            to: '/admin/catalog/packages',
            label: 'Packages List',
            icon: Boxes,
            end: true,
          },
        ],
      },
      {
        label: 'Products',
        icon: ShoppingCart,
        children: [
          {
            label: 'Inventory',
            icon: ShoppingCart,
            children: [
              { to: '/admin/catalog/products', label: 'Products', icon: Box, end: true },
              { to: '/admin/catalog/products/new', label: 'Add Product', icon: Plus },
              { to: '/admin/catalog/categories', label: 'Categories', icon: LayoutGrid, end: true },
            ],
          },
          { to: '/admin/catalog/consumables', label: 'Consumables', icon: FlaskConical, end: true },
        ],
      },
      {
        label: 'Promotions',
        icon: Ticket,
        children: [
          { to: '/admin/catalog/promotions/new', label: 'New Coupon', icon: Plus },
          { to: '/admin/catalog/promotions', label: 'Coupon List', icon: List, end: true },
        ],
      },
    ],
  },
  {
    category: 'Sales',
    items: [{ to: '/admin/payments', label: 'Payments', icon: Wallet }],
  },
  {
    category: 'Administration',
    items: [
      {
        label: 'Operations',
        icon: Settings,
        children: [
          { to: '/admin/operations/expenses', label: 'Expenses', icon: Receipt, end: true },
          {
            to: '/admin/operations/branch-orders',
            label: 'Branch Orders',
            icon: ClipboardList,
            end: true,
          },
          {
            to: '/admin/operations/franchise-orders',
            label: 'Franchise Orders',
            icon: FileText,
            end: true,
          },
          { to: '/admin/operations/waste', label: 'Waste', icon: TriangleAlert, end: true },
          { to: '/admin/operations/warehouse', label: 'Warehouse', icon: ShoppingBasket, end: true },
          {
            to: '/admin/operations/stock-transfers',
            label: 'Stock Transfers',
            icon: ArrowLeftRight,
            end: true,
          },
        ],
      },
      {
        label: 'Forms',
        icon: FileText,
        children: [
          { to: '/admin/forms/imajica', label: 'Imajica Forms', icon: ClipboardList, end: true },
        ],
      },
    ],
  },
  {
    category: 'Analytics',
    items: [
      { to: '/admin/analytics/sales-reports', label: 'Sales Reports', icon: PieChart },
      {
        to: '/admin/analytics/sales-product-report',
        label: 'Sales Product Report',
        icon: Package,
      },
      {
        to: '/admin/analytics/best-selling-treatments',
        label: 'Best Selling Treatments',
        icon: Activity,
      },
      {
        to: '/admin/analytics/new-client-sales',
        label: 'New Client Sales',
        icon: UserPlus,
      },
    ],
  },
  {
    category: 'Team',
    items: [
      {
        label: 'Staff',
        icon: User,
        children: [
          { to: '/admin/staff/new', label: 'New Staff', icon: UserPlus },
          { to: '/admin/staff', label: 'Staff List', icon: Users, end: true },
          { to: '/admin/staff/sales', label: 'Staff Sales', icon: BarChart3 },
          { to: '/admin/staff/positions', label: 'Positions', icon: List },
        ],
      },
      { to: '/admin/plan-b-incentive', label: 'Plan B Incentive', icon: Award },
      {
        to: '/admin/team/recruitment-lms',
        label: 'Recruitment & LMS',
        icon: GraduationCap,
        trailingChevron: true,
      },
      {
        label: 'User Access',
        icon: ShieldCheck,
        children: [
          { to: '/admin/team/user-access/new', label: 'New User', icon: UserPlus },
          { to: '/admin/team/user-access', label: 'Users List', icon: Users, end: true },
        ],
      },
      {
        label: 'Branches',
        icon: Map,
        children: [
          { to: '/admin/team/branches/new', label: 'New Branch', icon: Store },
          { to: '/admin/team/branches', label: 'Branches List', icon: List, end: true },
          {
            to: '/admin/team/branches/accounts',
            label: 'Branches Accounts',
            icon: KeyRound,
            end: true,
          },
        ],
      },
    ],
  },
  {
    category: 'Marketing',
    items: [{ to: '/admin/marketing', label: 'Marketing', icon: Megaphone }],
  },
  {
    items: [{ to: '/admin/settings', label: 'Settings', icon: Settings }],
  },
]

/** Shared HR module links (Salary, Employee DB, KPIs, Attendance, Leave, …) */
function buildHrPeopleOpsNavItems(clinics: Branch[]): NavNode[] {
  const attendanceChildren: NavNode[] = [
    {
      to: '/admin/hr/attendance',
      label: 'All Branches Attendance',
      icon: Clock,
      end: true,
    },
    ...clinics.map((b) => ({
      to: `/admin/hr/attendance/${b.id}`,
      label: `${shortBranchName(b.name)} Attendance`,
      icon: Clock,
    })),
  ]

  return [
    {
      label: 'Salary',
      icon: Banknote,
      children: [
        {
          to: '/admin/hr/salary',
          label: 'All Salary',
          icon: Banknote,
          end: true,
        },
        ...clinics.map((b) => ({
          to: `/admin/hr/salary/${b.id}`,
          label: `${shortBranchName(b.name)} Salary`,
          icon: Banknote,
        })),
      ],
    },
    { to: '/admin/staff', label: 'Employee Database', icon: Users, end: true },
    { to: '/admin/hr/kpis', label: "KPI's and Performance", icon: Target },
    {
      label: 'Attendance',
      icon: Clock,
      children: attendanceChildren,
    },
    { to: '/admin/hr/leave', label: 'Leave Management', icon: CalendarOff },
    { to: '/admin/hr/deductions', label: 'Deductions & Benefits', icon: HandCoins },
    { to: '/admin/hr/recruitment', label: 'Recruitment', icon: Briefcase },
    { to: '/admin/hr/new-hires', label: 'New Hires', icon: UserPlus },
    { to: '/admin/hr/exits', label: 'Resignation / Exits', icon: UserMinus },
    { to: '/admin/hr/training', label: 'Training', icon: GraduationCap },
  ]
}

function buildHqNavSections(clinics: Branch[]): NavSection[] {
  const sections = hqNavSectionsBase.map((section) => ({ ...section, items: [...section.items] }))
  const hrSection: NavSection = {
    category: 'HR and Payroll',
    items: buildHrPeopleOpsNavItems(clinics),
  }
  const adminIdx = sections.findIndex((s) => s.category === 'Administration')
  if (adminIdx >= 0) {
    sections.splice(adminIdx + 1, 0, hrSection)
  } else {
    const settingsIdx = sections.findIndex(
      (s) => !s.category && s.items.some((i) => 'to' in i && i.to === '/admin/settings'),
    )
    if (settingsIdx >= 0) sections.splice(settingsIdx, 0, hrSection)
    else sections.push(hrSection)
  }
  return sections
}

/** Clinical / ops staff — Timeclock home; no Team or Marketing; HQ-only analytics trimmed */
function buildTimeclockStaffNavSections(): NavSection[] {
  const hqOnlyAnalytics = new Set([
    '/admin/analytics/sales-product-report',
    '/admin/analytics/best-selling-treatments',
    '/admin/analytics/new-client-sales',
  ])
  const hqOnlyCategories = new Set(['HR and Payroll'])
  const sections: NavSection[] = [
    {
      items: [
        { to: '/admin/attendance', label: 'My Attendance', icon: CalendarDays },
        { to: '/admin/my-leave', label: 'My Leave', icon: CalendarOff },
        { to: '/admin/my-training', label: 'My Training', icon: GraduationCap },
        { to: '/admin/commission-sales', label: 'My Commission & Sales', icon: Wallet },
        { to: '/admin/my-salary', label: 'My Salary', icon: Banknote },
      ],
    },
  ]
  for (const section of hqNavSectionsBase) {
    if (!section.category) continue
    if (section.category === 'Team' || section.category === 'Marketing') continue
    if (hqOnlyCategories.has(section.category)) continue
    if (section.category === 'Analytics') {
      const items = section.items.filter(
        (item) => !('to' in item && item.to && hqOnlyAnalytics.has(item.to)),
      )
      if (items.length) sections.push({ ...section, items })
      continue
    }
    sections.push(section)
  }
  sections.push({
    items: [{ to: '/admin/settings', label: 'Settings', icon: Settings }],
  })
  return sections
}

function shortBranchName(name: string) {
  return name.split(',')[0]?.trim() || name
}

/** HR sidebar — org-wide people ops; Attendance expands per clinic */
function buildHrNavSections(clinics: Branch[]): NavSection[] {
  return [
    {
      items: buildHrPeopleOpsNavItems(clinics),
    },
    {
      items: [{ to: '/admin/settings', label: 'Settings', icon: Settings }],
    },
  ]
}

/** Clinic manager (BRANCH_ADMIN) — trimmed to their clinic ops only */
const franchiseOwnerNavSections: NavSection[] = [
  {
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/attendance', label: 'My Attendance', icon: Clock },
      { to: '/admin/my-leave', label: 'My Leave', icon: CalendarOff },
      { to: '/admin/my-training', label: 'My Training', icon: GraduationCap },
      { to: '/admin/hr/leave', label: 'Leave Approvals', icon: CalendarOff },
      { to: '/admin/my-salary', label: 'My Salary', icon: Banknote },
    ],
  },
  {
    category: 'Scheduling',
    items: [
      { to: '/admin/appointments', label: 'Client Scheduling', icon: CalendarDays },
      { to: '/admin/booking', label: 'Booking', icon: ShoppingBag },
    ],
  },
  {
    category: 'Sales',
    items: [{ to: '/admin/payments', label: 'Franchise Sale', icon: Wallet }],
  },
  {
    category: 'Catalog',
    items: [
      {
        label: 'Services & Packages',
        icon: Package,
        children: [
          { to: '/admin/catalog/services/new', label: 'New Service', icon: Plus },
          { to: '/admin/catalog/services', label: 'Services List', icon: List, end: true },
          { to: '/admin/catalog/packages', label: 'Packages List', icon: Boxes, end: true },
        ],
      },
      {
        label: 'Products',
        icon: ShoppingCart,
        children: [
          { to: '/admin/catalog/products', label: 'Products', icon: Box, end: true },
          { to: '/admin/catalog/products/new', label: 'Add Product', icon: Plus },
          { to: '/admin/catalog/consumables', label: 'Consumables', icon: FlaskConical, end: true },
        ],
      },
      {
        label: 'Promotions',
        icon: Ticket,
        children: [
          { to: '/admin/catalog/promotions/new', label: 'New Coupon', icon: Plus },
          { to: '/admin/catalog/promotions', label: 'Coupon List', icon: List, end: true },
        ],
      },
    ],
  },
  {
    category: 'Customers',
    items: [
      {
        label: 'Customers',
        icon: Users,
        children: [
          { to: '/admin/clients/new', label: 'New Customer', icon: UserPlus },
          { to: '/admin/clients', label: 'Customer List', icon: Users, end: true },
        ],
      },
    ],
  },
  {
    category: 'Administration',
    items: [
      {
        label: 'Operations',
        icon: Settings,
        children: [
          { to: '/admin/operations/expenses', label: 'Expenses', icon: Receipt, end: true },
          {
            to: '/admin/operations/branch-orders',
            label: 'Branch Orders',
            icon: ClipboardList,
            end: true,
          },
          {
            to: '/admin/operations/franchise-orders',
            label: 'Franchise Orders',
            icon: FileText,
            end: true,
          },
          { to: '/admin/operations/waste', label: 'Waste', icon: TriangleAlert, end: true },
          {
            to: '/admin/catalog/products',
            label: 'Branch Stock',
            icon: ShoppingBasket,
            end: true,
          },
        ],
      },
      {
        label: 'Forms',
        icon: FileText,
        children: [
          { to: '/admin/forms/imajica', label: 'Imajica Forms', icon: ClipboardList, end: true },
        ],
      },
    ],
  },
  {
    category: 'Team',
    items: [
      {
        label: 'Staff',
        icon: User,
        children: [
          { to: '/admin/staff/new', label: 'New Staff', icon: UserPlus },
          { to: '/admin/staff', label: 'Staff List', icon: Users, end: true },
        ],
      },
      { to: '/admin/plan-b-incentive', label: 'Plan B Incentive', icon: Award },
    ],
  },
  {
    category: 'Reports',
    items: [
      { to: '/admin/analytics/sales-reports', label: 'Branch Sales', icon: PieChart },
      {
        to: '/admin/reports/branch-attendance',
        label: 'Branch Attendance',
        icon: Clock,
      },
    ],
  },
  {
    items: [{ to: '/admin/settings', label: 'Settings', icon: Settings }],
  },
]

function linkClass(isActive: boolean) {
  return cn(
    'relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] transition-colors',
    isActive
      ? 'bg-[#1a4a3c] text-white shadow-[inset_0_0_0_1px_rgba(197,160,89,0.28)]'
      : 'text-white/85 hover:bg-white/[0.08] hover:text-white',
  )
}

function ActiveBar() {
  return (
    <span
      aria-hidden
      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#C5A059]"
    />
  )
}

function pathMatches(pathname: string, to: string, end?: boolean) {
  if (end) return pathname === to
  return pathname === to || pathname.startsWith(to + '/')
}

function nodeIsActive(pathname: string, node: NavNode): boolean {
  if (isNavGroup(node)) return node.children.some((c) => nodeIsActive(pathname, c))
  return pathMatches(pathname, node.to, node.end)
}

function NestedNavTree({
  nodes,
  onNavigate,
  depth = 0,
}: {
  nodes: NavNode[]
  onNavigate: () => void
  depth?: number
}) {
  return (
    <div
      className={cn(
        'relative mt-1 space-y-0.5 border-l border-white/12 pl-2.5',
        depth === 0 ? 'ml-5' : 'ml-3.5',
      )}
    >
      {nodes.map((node) =>
        isNavGroup(node) ? (
          <NestedExpandable key={node.label} group={node} onNavigate={onNavigate} depth={depth} />
        ) : (
          <NavLink
            key={node.to}
            to={node.to}
            end={node.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[12.5px] transition-colors',
                isActive
                  ? 'bg-[#1a4a3c] font-medium text-white shadow-[inset_0_0_0_1px_rgba(197,160,89,0.22)]'
                  : 'text-white/75 hover:bg-white/[0.08] hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <node.icon
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isActive ? 'text-[#C5A059]' : 'text-[#C5A059]/65',
                  )}
                />
                <span className="leading-snug">{node.label}</span>
              </>
            )}
          </NavLink>
        ),
      )}
    </div>
  )
}

function NestedExpandable({
  group,
  onNavigate,
  depth,
}: {
  group: NavGroup
  onNavigate: () => void
  depth: number
}) {
  const location = useLocation()
  const childActive = nodeIsActive(location.pathname, group)
  const [expanded, setExpanded] = useState(childActive)

  useEffect(() => {
    if (childActive) setExpanded(true)
  }, [childActive])

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[12.5px] transition-colors',
          childActive
            ? 'bg-[#1a4a3c] font-medium text-white shadow-[inset_0_0_0_1px_rgba(197,160,89,0.22)]'
            : 'text-white/75 hover:bg-white/[0.08] hover:text-white',
        )}
      >
        <group.icon
          className={cn('h-3.5 w-3.5 shrink-0', childActive ? 'text-[#C5A059]' : 'text-[#C5A059]/65')}
        />
        <span className="flex-1 text-left leading-snug">{group.label}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-white/55 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>
      {expanded ? (
        <NestedNavTree nodes={group.children} onNavigate={onNavigate} depth={depth + 1} />
      ) : null}
    </div>
  )
}

function ExpandableNavItem({
  item,
  onNavigate,
}: {
  item: NavItem & { children: NavNode[] }
  onNavigate: () => void
}) {
  const location = useLocation()
  const childActive = item.children.some((c) => nodeIsActive(location.pathname, c))
  const [expanded, setExpanded] = useState(childActive)

  useEffect(() => {
    if (childActive) setExpanded(true)
  }, [childActive])

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(linkClass(childActive), 'w-full')}
      >
        {childActive ? <ActiveBar /> : null}
        <item.icon
          className={cn('h-4 w-4 shrink-0', childActive ? 'text-[#C5A059]' : 'text-[#C5A059]/80')}
        />
        <span className="flex-1 text-left font-medium leading-snug">{item.label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-white/55 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>
      {expanded ? <NestedNavTree nodes={item.children} onNavigate={onNavigate} depth={0} /> : null}
    </div>
  )
}

export function AdminSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()
  const { branches } = useBranch()
  const hrClinics = useMemo(
    () =>
      branches
        .filter((b) => b.status === 'active' && b.branchType !== 'warehouse')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [branches],
  )
  const navSections = useMemo(() => {
    if (isTimeclockStaff(user)) return buildTimeclockStaffNavSections()
    if (isFranchiseBranchOwner(user)) return franchiseOwnerNavSections
    if (isHrRole(user?.role)) return buildHrNavSections(hrClinics)
    return buildHqNavSections(hrClinics)
  }, [user, hrClinics])
  const close = () => onOpenChange(false)

  const content = (
    <div className="flex h-full min-h-0 flex-col bg-emerald-950 text-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-4">
        <img
          src={logo}
          alt={BRAND.name}
          className="h-10 w-10 rounded-full object-cover ring-1 ring-[#C5A059]/35"
        />
        <div className="min-w-0">
          <p className="font-brand text-[17px] leading-tight tracking-wide text-[#E8C547]">
            IMAJICA
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#C5A059]/90">
            Medical Aesthetics
          </p>
        </div>
      </div>

      <nav className="scrollbar-sidebar min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section, sectionIdx) => (
          <div
            key={section.category ?? `section-${sectionIdx}`}
            className={cn(sectionIdx > 0 && 'mt-5')}
          >
            {section.category ? (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]/80">
                {section.category}
              </p>
            ) : null}
            <div className="space-y-1">
              {section.items.map((item) =>
                item.children ? (
                  <ExpandableNavItem
                    key={item.label}
                    item={item as NavItem & { children: NavNode[] }}
                    onNavigate={close}
                  />
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to!}
                    end={item.end}
                    onClick={close}
                    className={({ isActive }) => linkClass(isActive)}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? <ActiveBar /> : null}
                        <item.icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isActive ? 'text-[#C5A059]' : 'text-[#C5A059]/80',
                          )}
                        />
                        <span className="flex-1 font-medium leading-snug">{item.label}</span>
                        {item.trailingChevron ? (
                          <ChevronRight className="h-4 w-4 shrink-0 text-white/45" />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto shrink-0 border-t border-white/10 p-3">
        <div className="rounded-[12px] border border-white/10 bg-gradient-to-br from-[#0f3d32] to-[#0A2E26] px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Imajica
          </p>
          <p className="mt-1 font-brand text-sm leading-snug text-[#E8C547]">{BRAND.tagline}</p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-white/50">{BRAND.slogan}</p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden h-full w-[17rem] shrink-0 lg:block">{content}</aside>
      <MobileDrawer open={open} onClose={close} side="left" panelClassName="bg-emerald-950">
        <div className="relative h-full">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 text-white"
            onClick={close}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
          {content}
        </div>
      </MobileDrawer>
    </>
  )
}
