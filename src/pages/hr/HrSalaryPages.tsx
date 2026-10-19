import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import {
  COMPANY_OWNED_BRANCH_IDS,
  FRANCHISE_CLINIC_BRANCH_IDS,
} from '@/constants/teamAccountsSeed'
import { AttendancePayrollPage } from '@/pages/payroll/AttendancePayrollPage'
import { canAccessPeopleOps, isBranchOwner } from '@/utils/franchiseAccess'

function shortBranchName(name: string) {
  return name.split(',')[0]?.trim() || name
}

/** @deprecated Prefer Branch Salary — kept so /admin/hr/salary redirects cleanly. */
export function HrAllSalaryPage() {
  const { user } = useAuth()
  if (isBranchOwner(user) && user?.branchId) {
    return <Navigate to={`/admin/hr/salary/${user.branchId}`} replace />
  }
  return <Navigate to="/admin/hr/salary/branches" replace />
}

/** HR: San Mateo, Pasig, Lipa, Cainta (company-owned). */
export function HrBranchSalaryPage() {
  const { user } = useAuth()

  if (isBranchOwner(user) && user?.branchId) {
    return <Navigate to={`/admin/hr/salary/${user.branchId}`} replace />
  }
  if (!canAccessPeopleOps(user)) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return (
    <AttendancePayrollPage
      title="Branch Salary"
      description="Company-owned clinics: San Mateo, Pasig, Lipa, and Cainta. 1–15 basic only; 16–end adds incentives, commission, and allowance."
      branchIds={[...COMPANY_OWNED_BRANCH_IDS]}
    />
  )
}

/** HR: Dasmariñas & Bacoor (franchise). */
export function HrFranchiseSalaryPage() {
  const { user } = useAuth()

  if (isBranchOwner(user) && user?.branchId) {
    return <Navigate to={`/admin/hr/salary/${user.branchId}`} replace />
  }
  if (!canAccessPeopleOps(user)) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return (
    <AttendancePayrollPage
      title="Franchise Salary"
      description="Franchise clinics: Dasmariñas and Bacoor. 1–15 basic only; 16–end adds incentives, commission, and allowance."
      branchIds={[...FRANCHISE_CLINIC_BRANCH_IDS]}
    />
  )
}

/** HR or clinic manager: salary for one clinic (e.g. Bacoor Salary). */
export function HrClinicSalaryPage() {
  const { branchId } = useParams<{ branchId: string }>()
  const { user } = useAuth()
  const { branches } = useBranch()
  const branch = branches.find((b) => b.id === branchId)
  const clinicManager = isBranchOwner(user)

  if (clinicManager && user?.branchId && branchId !== user.branchId) {
    return <Navigate to={`/admin/hr/salary/${user.branchId}`} replace />
  }

  if (!branchId || !branch || branch.branchType === 'warehouse') {
    if (clinicManager && user?.branchId) {
      return <Navigate to={`/admin/hr/salary/${user.branchId}`} replace />
    }
    return <Navigate to="/admin/hr/salary/branches" replace />
  }

  const short = shortBranchName(branch.name)

  return (
    <AttendancePayrollPage
      title={`${short} Salary`}
      description={`Payroll for ${branch.name}. 1–15 basic only; 16–end adds incentives, commission, and allowance. Review then send payslips.`}
      branchIds={[branch.id]}
    />
  )
}
