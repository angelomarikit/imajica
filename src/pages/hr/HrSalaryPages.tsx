import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBranch } from '@/contexts/BranchContext'
import { AttendancePayrollPage } from '@/pages/payroll/AttendancePayrollPage'
import { canAccessPeopleOps, isBranchOwner } from '@/utils/franchiseAccess'

function shortBranchName(name: string) {
  return name.split(',')[0]?.trim() || name
}

/** HR: salary / payroll across every active clinic. */
export function HrAllSalaryPage() {
  const { user } = useAuth()
  const { branches } = useBranch()

  // Clinic managers only get their own clinic salary page
  if (isBranchOwner(user) && user?.branchId) {
    return <Navigate to={`/admin/hr/salary/${user.branchId}`} replace />
  }
  if (!canAccessPeopleOps(user)) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const branchIds = branches
    .filter((b) => b.status === 'active' && b.branchType !== 'warehouse')
    .map((b) => b.id)

  return (
    <AttendancePayrollPage
      title="All Salary"
      description="Payroll across every company-owned and franchise clinic — rates, attendance hours, and statutory deductions. Send payslips to each employee from the preview."
      branchIds={branchIds}
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
    return <Navigate to="/admin/hr/salary" replace />
  }

  const short = shortBranchName(branch.name)

  return (
    <AttendancePayrollPage
      title={`${short} Salary`}
      description={`Payroll for ${branch.name} — based on registered staff attendance. Review rates, hours, deductions, then send payslips to employees.`}
      branchIds={[branch.id]}
    />
  )
}
