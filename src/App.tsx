import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AdminShell } from '@/components/layout/AdminShell'
import { ClientShell } from '@/components/layout/ClientShell'
import { PublicOnly, RequireAuth, RequireClient, RequireHqAdmin, RequireRole, RequireStaff } from '@/components/layout/RouteGuards'
import { AuthProvider, isStaffRole, useAuth } from '@/contexts/AuthContext'
import { BranchProvider } from '@/contexts/BranchContext'
import { SalesDataBootstrap } from '@/components/SalesDataBootstrap'
import { queryClient } from '@/lib/queryClient'
import { getStaffHomePath, isHqRole } from '@/utils/franchiseAccess'
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { BestSellingTreatmentsPage } from '@/pages/analytics/BestSellingTreatmentsPage'
import { NewClientSalesPage } from '@/pages/analytics/NewClientSalesPage'
import { SalesProductReportPage } from '@/pages/analytics/SalesProductReportPage'
import { SalesReportsPage } from '@/pages/analytics/SalesReportsPage'
import { BranchOrdersPage } from '@/pages/admin/BranchOrdersPage'
import { ExpensesPage } from '@/pages/admin/ExpensesPage'
import { FranchiseOrdersPage } from '@/pages/admin/FranchiseOrdersPage'
import { NewBranchOrderPage } from '@/pages/admin/NewBranchOrderPage'
import { NewFranchiseOrderPage } from '@/pages/admin/NewFranchiseOrderPage'
import { WasteInventoryPage } from '@/pages/admin/WasteInventoryPage'
import { WarehousePage } from '@/pages/admin/WarehousePage'
import { AddWarehouseItemPage } from '@/pages/admin/AddWarehouseItemPage'
import { ImajicaFormsPage } from '@/pages/admin/ImajicaFormsPage'
import { StockTransfersPage } from '@/pages/admin/StockTransfersPage'
import { NewStockTransferPage } from '@/pages/admin/NewStockTransferPage'
import { RecruitmentLmsPage } from '@/pages/team/RecruitmentLmsPage'
import { NewBranchPage } from '@/pages/team/NewBranchPage'
import { TeamBranchesPage } from '@/pages/team/TeamBranchesPage'
import { BranchAccountsPage } from '@/pages/team/BranchAccountsPage'
import { NewBranchAccountPage } from '@/pages/team/NewBranchAccountPage'
import { NewUserPage } from '@/pages/team/NewUserPage'
import { UserAccessPage } from '@/pages/team/UserAccessPage'
import { AppointmentsPage } from '@/pages/appointments/AppointmentsPage'
import {
  ClientAppointmentsPage,
  ClientBookPage,
  ClientDashboardPage,
  ClientNotificationsPage,
  ClientPackagesPage,
  ClientPaymentsPage,
  ClientProfilePage,
  ClientTreatmentsPage,
} from '@/pages/client/ClientPages'
import { ClientsPage } from '@/pages/clients/ClientsPage'
import { ClientProfilePage as AdminClientProfilePage } from '@/pages/clients/ClientProfilePage'
import { NewClientPage } from '@/pages/clients/NewClientPage'
import { CategoryInventoryPage } from '@/pages/catalog/CategoryInventoryPage'
import { ConsumablesInventoryPage } from '@/pages/catalog/ConsumablesInventoryPage'
import { ViewConsumablePage } from '@/pages/catalog/ViewConsumablePage'
import { CouponListPage } from '@/pages/catalog/CouponListPage'
import { NewCouponPage } from '@/pages/catalog/NewCouponPage'
import { NewPackagePage } from '@/pages/catalog/NewPackagePage'
import { NewServicePage } from '@/pages/catalog/NewServicePage'
import { PackageListPage } from '@/pages/catalog/PackageListPage'
import { ProductInventoryPage } from '@/pages/catalog/ProductInventoryPage'
import { ViewProductPage } from '@/pages/catalog/ViewProductPage'
import { EditProductPage } from '@/pages/catalog/EditProductPage'
import { ServiceListPage } from '@/pages/catalog/ServiceListPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { KioskTimeClockPage } from '@/pages/attendance/KioskTimeClockPage'
import { MyAttendancePage } from '@/pages/attendance/MyAttendancePage'
import { MyCommissionSalesPage } from '@/pages/staff/MyCommissionSalesPage'
import { BranchAttendancePage } from '@/pages/attendance/BranchAttendancePage'
import { BranchesAttendancePage } from '@/pages/attendance/BranchesAttendancePage'
import { FranchiseAttendancePage } from '@/pages/attendance/FranchiseAttendancePage'
import { AttendancePayrollPage } from '@/pages/payroll/AttendancePayrollPage'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import { MarketingPage } from '@/pages/marketing/MarketingPage'
import { PackagesPage } from '@/pages/packages/PackagesPage'
import { PayrollPage } from '@/pages/payroll/PayrollPage'
import { LandingPage } from '@/pages/public/LandingPage'
import { BookingPage, PaymentsPage } from '@/pages/sales/SalesPage'
import { SettingsRoutes } from '@/pages/settings/SettingsPage'
import { NewStaffPage } from '@/pages/staff/NewStaffPage'
import { StaffPositionsPage } from '@/pages/staff/StaffPositionsPage'
import { StaffSalesPage } from '@/pages/staff/StaffSalesPage'
import { CommissionsPage, StaffDetailPage, StaffPage } from '@/pages/staff/StaffPage'
import { TreatmentsPage } from '@/pages/treatments/TreatmentsPage'

function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <LandingPage />
  return <Navigate to={isStaffRole(user.role) ? getStaffHomePath(user) : '/client/dashboard'} replace />
}

function AdminDashboardGate() {
  const { user } = useAuth()
  if (user && !isHqRole(user.role)) {
    return <Navigate to={getStaffHomePath(user)} replace />
  }
  return <DashboardPage />
}

function AdminIndexRedirect() {
  const { user } = useAuth()
  const home = getStaffHomePath(user)
  const relative = home.startsWith('/admin/') ? home.slice('/admin/'.length) : 'dashboard'
  return <Navigate to={relative} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SalesDataBootstrap />
      <AuthProvider>
        <BranchProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/timeclock" element={<KioskTimeClockPage />} />

              <Route element={<PublicOnly />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Route>

              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <RequireStaff>
                      <AdminShell />
                    </RequireStaff>
                  </RequireAuth>
                }
              >
                <Route index element={<AdminIndexRedirect />} />
                <Route path="dashboard" element={<AdminDashboardGate />} />
                <Route path="attendance" element={<MyAttendancePage />} />
                <Route path="commission-sales" element={<MyCommissionSalesPage />} />
                <Route
                  path="reports/branch-attendance"
                  element={
                    <RequireRole roles={['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN']}>
                      <BranchAttendancePage />
                    </RequireRole>
                  }
                />
                <Route
                  path="reports/branches-attendance"
                  element={
                    <RequireHqAdmin>
                      <BranchesAttendancePage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="reports/franchise-attendance"
                  element={
                    <RequireHqAdmin>
                      <FranchiseAttendancePage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="reports/payroll"
                  element={
                    <RequireHqAdmin>
                      <AttendancePayrollPage />
                    </RequireHqAdmin>
                  }
                />
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="clients/new" element={<NewClientPage />} />
                <Route path="clients/:id" element={<AdminClientProfilePage />} />
                <Route path="catalog/services" element={<ServiceListPage />} />
                <Route path="catalog/services/new" element={<NewServicePage />} />
                <Route path="catalog/packages" element={<PackageListPage />} />
                <Route
                  path="catalog/packages/new"
                  element={
                    <RequireHqAdmin>
                      <NewPackagePage />
                    </RequireHqAdmin>
                  }
                />
                <Route path="catalog/products" element={<ProductInventoryPage />} />
                <Route path="catalog/products/new" element={<EditProductPage />} />
                <Route path="catalog/products/:id" element={<ViewProductPage />} />
                <Route path="catalog/products/:id/edit" element={<EditProductPage />} />
                <Route
                  path="catalog/categories"
                  element={
                    <RequireHqAdmin>
                      <CategoryInventoryPage />
                    </RequireHqAdmin>
                  }
                />
                <Route path="catalog/consumables" element={<ConsumablesInventoryPage />} />
                <Route path="catalog/consumables/:id" element={<ViewConsumablePage />} />
                <Route path="catalog/promotions" element={<CouponListPage />} />
                <Route path="catalog/promotions/new" element={<NewCouponPage />} />
                <Route path="treatments" element={<Navigate to="/admin/catalog/services" replace />} />
                <Route path="packages" element={<Navigate to="/admin/catalog/packages" replace />} />
                <Route path="treatments-legacy" element={<TreatmentsPage />} />
                <Route path="packages-legacy" element={<PackagesPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="booking" element={<BookingPage />} />
                <Route path="sales" element={<Navigate to="/admin/booking" replace />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="staff/new" element={<NewStaffPage />} />
                <Route
                  path="staff/sales"
                  element={
                    <RequireHqAdmin>
                      <StaffSalesPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="staff/positions"
                  element={
                    <RequireHqAdmin>
                      <StaffPositionsPage />
                    </RequireHqAdmin>
                  }
                />
                <Route path="staff" element={<StaffPage />} />
                <Route path="staff/:id" element={<StaffDetailPage />} />
                <Route
                  path="commissions"
                  element={
                    <RequireHqAdmin>
                      <CommissionsPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="payroll"
                  element={
                    <RequireHqAdmin>
                      <PayrollPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="team/recruitment-lms"
                  element={
                    <RequireHqAdmin>
                      <RecruitmentLmsPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="team/user-access/new"
                  element={
                    <RequireHqAdmin>
                      <NewUserPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="team/user-access"
                  element={
                    <RequireHqAdmin>
                      <UserAccessPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="team/branches/new"
                  element={
                    <RequireHqAdmin>
                      <NewBranchPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="team/branches/accounts/new"
                  element={
                    <RequireHqAdmin>
                      <NewBranchAccountPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="team/branches/accounts"
                  element={
                    <RequireHqAdmin>
                      <BranchAccountsPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="team/branches"
                  element={
                    <RequireHqAdmin>
                      <TeamBranchesPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="settings/branches"
                  element={<Navigate to="/admin/team/branches" replace />}
                />
                <Route
                  path="settings/users"
                  element={<Navigate to="/admin/team/user-access" replace />}
                />
                <Route
                  path="reports"
                  element={<Navigate to="/admin/analytics/sales-reports" replace />}
                />
                <Route path="analytics/sales-reports" element={<SalesReportsPage />} />
                <Route
                  path="analytics/sales-product-report"
                  element={
                    <RequireHqAdmin>
                      <SalesProductReportPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="analytics/best-selling-treatments"
                  element={
                    <RequireHqAdmin>
                      <BestSellingTreatmentsPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="analytics/new-client-sales"
                  element={
                    <RequireHqAdmin>
                      <NewClientSalesPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="marketing"
                  element={
                    <RequireHqAdmin>
                      <MarketingPage />
                    </RequireHqAdmin>
                  }
                />
                <Route path="operations/expenses" element={<ExpensesPage />} />
                <Route path="operations/branch-orders" element={<BranchOrdersPage />} />
                <Route path="operations/branch-orders/new" element={<NewBranchOrderPage />} />
                <Route path="operations/franchise-orders" element={<FranchiseOrdersPage />} />
                <Route
                  path="operations/franchise-orders/new"
                  element={<NewFranchiseOrderPage />}
                />
                <Route path="operations/waste" element={<WasteInventoryPage />} />
                <Route path="operations/warehouse" element={<WarehousePage />} />
                <Route
                  path="operations/warehouse/new"
                  element={
                    <RequireHqAdmin>
                      <AddWarehouseItemPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="operations/stock-transfers"
                  element={
                    <RequireHqAdmin>
                      <StockTransfersPage />
                    </RequireHqAdmin>
                  }
                />
                <Route
                  path="operations/stock-transfers/new"
                  element={
                    <RequireHqAdmin>
                      <NewStockTransferPage />
                    </RequireHqAdmin>
                  }
                />
                <Route path="forms/imajica" element={<ImajicaFormsPage />} />
                <Route path="settings/*" element={<SettingsRoutes />} />
              </Route>

              <Route
                path="/client"
                element={
                  <RequireAuth>
                    <RequireClient>
                      <ClientShell />
                    </RequireClient>
                  </RequireAuth>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ClientDashboardPage />} />
                <Route path="appointments" element={<ClientAppointmentsPage />} />
                <Route path="book" element={<ClientBookPage />} />
                <Route path="treatments" element={<ClientTreatmentsPage />} />
                <Route path="packages" element={<ClientPackagesPage />} />
                <Route path="payments" element={<ClientPaymentsPage />} />
                <Route path="profile" element={<ClientProfilePage />} />
                <Route path="notifications" element={<ClientNotificationsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </BranchProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
