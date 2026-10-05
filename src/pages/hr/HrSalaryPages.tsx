import { Navigate, useParams } from 'react-router-dom'
import { useBranch } from '@/contexts/BranchContext'
import { AttendancePayrollPage } from '@/pages/payroll/AttendancePayrollPage'

function shortBranchName(name: string) {
  return name.split(',')[0]?.trim() || name
}

/** HR: salary / payroll across every active clinic. */
export function HrAllSalaryPage() {
  const { branches } = useBranch()
  const branchIds = branches
    .filter((b) => b.status === 'active' && b.branchType !== 'warehouse')
    .map((b) => b.id)

  return (
    <AttendancePayrollPage
      title="All Salary"
      description="Payroll across every company-owned and franchise clinic — rates, attendance hours, and statutory deductions."
      branchIds={branchIds}
    />
  )
}

/** HR: salary for one clinic (e.g. San Mateo Salary). */
export function HrClinicSalaryPage() {
  const { branchId } = useParams<{ branchId: string }>()
  const { branches } = useBranch()
  const branch = branches.find((b) => b.id === branchId)

  if (!branchId || !branch || branch.branchType === 'warehouse') {
    return <Navigate to="/admin/hr/salary" replace />
  }

  const short = shortBranchName(branch.name)

  return (
    <AttendancePayrollPage
      title={`${short} Salary`}
      description={`Payroll for ${branch.name} — rates, attendance hours, and statutory deductions.`}
      branchIds={[branch.id]}
    />
  )
}
