import { Navigate, useParams } from 'react-router-dom'
import { useBranch } from '@/contexts/BranchContext'
import { GroupAttendancePage } from '@/pages/attendance/GroupAttendancePage'

function shortBranchName(name: string) {
  return name.split(',')[0]?.trim() || name
}

/** HR: attendance across every active clinic (company-owned + franchise). */
export function HrAllBranchesAttendancePage() {
  const { branches } = useBranch()
  const branchIds = branches
    .filter((b) => b.status === 'active' && b.branchType !== 'warehouse')
    .map((b) => b.id)

  return (
    <GroupAttendancePage
      title="All Branches Attendance"
      description="Time In / Time Out across every company-owned and franchise clinic."
      branchIds={branchIds}
      exportSlug="all-branches-attendance"
    />
  )
}

/** HR: attendance for one clinic (e.g. San Mateo Attendance). */
export function HrClinicAttendancePage() {
  const { branchId } = useParams<{ branchId: string }>()
  const { branches } = useBranch()
  const branch = branches.find((b) => b.id === branchId)

  if (!branchId || !branch || branch.branchType === 'warehouse') {
    return <Navigate to="/admin/hr/attendance" replace />
  }

  const short = shortBranchName(branch.name)

  return (
    <GroupAttendancePage
      title={`${short} Attendance`}
      description={`Time In / Time Out for ${branch.name}.`}
      branchIds={[branch.id]}
      exportSlug={`attendance-${(branch.code || short).toLowerCase().replace(/\s+/g, '-')}`}
    />
  )
}
