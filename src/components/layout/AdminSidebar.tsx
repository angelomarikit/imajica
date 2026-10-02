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
} from 'lucide-react'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import logo from '@/assets/logo-imajica.jpg'
import { BRAND } from '@/constants/brand'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'
import { isFranchiseBranchOwner, isTimeclockStaff } from '@/utils/franchiseAccess'
import { Button } from '@/components/ui/Button'
import { MobileDrawer } from '@/components/ui/MobileDrawer'

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

const hqNavSections: NavSection[] = [
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
    category: 'Attendance and Payroll',
    items: [
      {
        to: '/admin/reports/branches-attendance',
        label: 'Branches Attendance',
        icon: Clock,
      },
      {
        to: '/admin/reports/franchise-attendance',
        label: 'Franchise Attendance',
        icon: Clock,
      },
      {
        to: '/admin/reports/payroll',
        label: 'Payroll',
        icon: Wallet,
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

/** Clinical / ops staff — Timeclock home; no Team or Marketing; HQ-only analytics trimmed */
function buildTimeclockStaffNavSections(): NavSection[] {
  const hqOnlyAnalytics = new Set([
    '/admin/analytics/sales-product-report',
    '/admin/analytics/best-selling-treatments',
    '/admin/analytics/new-client-sales',
  ])
  const hqOnlyCategories = new Set(['Attendance and Payroll'])
  const sections: NavSection[] = [
    {
      items: [{ to: '/admin/attendance', label: 'My Attendance', icon: CalendarDays }],
    },
  ]
  for (const section of hqNavSections) {
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

/** Franchise branch owner — trimmed to their branch ops only */
const franchiseOwnerNavSections: NavSection[] = [
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
    'relative flex items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-[12.5px] transition-colors',
    isActive
      ? 'bg-[#1a4a3c] text-white shadow-[inset_0_0_0_1px_rgba(197,160,89,0.25)]'
      : 'text-white/85 hover:bg-white/10',
  )
}

function ActiveBar() {
  return (
    <span
      aria-hidden
      className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-r-full bg-[#C5A059]"
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
        'relative mt-0.5 space-y-px border-l border-white/15 pl-2.5',
        depth === 0 ? 'ml-4' : 'ml-3',
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
                'flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-[12px] transition-colors',
                isActive
                  ? 'bg-[#1a4a3c] font-medium text-white shadow-[inset_0_0_0_1px_rgba(197,160,89,0.2)]'
                  : 'text-white/75 hover:bg-white/10 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <node.icon
                  className={cn(
                    'h-3 w-3 shrink-0',
                    isActive ? 'text-[#C5A059]' : 'text-[#C5A059]/70',
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
          'flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-[12px] transition-colors',
          childActive
            ? 'bg-[#1a4a3c] font-medium text-white shadow-[inset_0_0_0_1px_rgba(197,160,89,0.2)]'
            : 'text-white/75 hover:bg-white/10 hover:text-white',
        )}
      >
        <group.icon
          className={cn('h-3 w-3 shrink-0', childActive ? 'text-[#C5A059]' : 'text-[#C5A059]/70')}
        />
        <span className="flex-1 text-left leading-snug">{group.label}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 shrink-0 text-white/70 transition-transform',
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
        <item.icon className={cn('h-3.5 w-3.5 shrink-0', childActive ? 'text-[#C5A059]' : 'text-[#C5A059]/80')} />
        <span className="flex-1 text-left font-medium leading-snug">{item.label}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 text-white/70 transition-transform', expanded && 'rotate-180')}
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
  const navSections = useMemo(() => {
    if (isTimeclockStaff(user)) return buildTimeclockStaffNavSections()
    if (isFranchiseBranchOwner(user)) return franchiseOwnerNavSections
    return hqNavSections
  }, [user])
  const close = () => onOpenChange(false)

  const content = (
    <div className="flex h-full flex-col bg-emerald-950 text-white">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-3.5 py-3">
        <img src={logo} alt={BRAND.name} className="h-9 w-9 rounded-full object-cover" />
        <div>
          <p className="font-brand text-base leading-tight tracking-wide">IMAJICA</p>
          <p className="text-[9px] uppercase tracking-[0.16em] text-gold">Medical Aesthetics</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-2.5 scrollbar-thin">
        {navSections.map((section, sectionIdx) => (
          <div
            key={section.category ?? `section-${sectionIdx}`}
            className={cn(sectionIdx > 0 && 'mt-2')}
          >
            {section.category ? (
              <p className="mb-1 px-2.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]/85">
                {section.category}
              </p>
            ) : null}
            <div className="space-y-px">
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
                    onClick={close}
                    className={({ isActive }) => linkClass(isActive)}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive ? <ActiveBar /> : null}
                        <item.icon
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            isActive ? 'text-[#C5A059]' : 'text-[#C5A059]/80',
                          )}
                        />
                        <span className="flex-1 font-medium leading-snug">{item.label}</span>
                        {item.trailingChevron ? (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/55" />
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
      <div className="mx-2 mb-2 overflow-hidden rounded-[10px] border border-white/10">
        <div className="h-12 bg-[url('https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80')] bg-cover bg-center" />
        <div className="bg-emerald-900 px-2.5 py-2">
          <p className="font-brand text-xs text-gold">{BRAND.tagline}</p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">{content}</aside>
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
