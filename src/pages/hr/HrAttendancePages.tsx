import { Navigate, useParams } from 'react-router-dom'
import { useBranch } from '@/contexts/BranchContext'
import { GroupAttendancePage } from '@/pages/attendance/GroupAttendancePage'
import { HQ_SENTINEL_BRANCH_ID } from '@/utils/franchiseAccess'

function shortBranchName(name: string) {
  return name.split(',')[0]?.trim() || name
}

/** HR: attendance across every active clinic (company-owned + franchise) + Head Office (OM). */
export function HrAllBranchesAttendancePage() {
  const { branches } = useBranch()
  const clinicIds = branches
    .filter((b) => b.status === 'active' && b.branchType !== 'warehouse' && b.id !== HQ_SENTINEL_BRANCH_ID)
    .map((b) => b.id)
  const branchIds = [HQ_SENTINEL_BRANCH_ID, ...clinicIds]

  return (
    <GroupAttendancePage
      title="All Branches Attendance"
      description="Time In / Time Out across every clinic plus Head Office (Operations Manager)."
      branchIds={branchIds}
      exportSlug="all-branches-attendance"
    />
  )
}

/**
 * HR: Head Office attendance (tagged staff — Samerah Sandigan).
 * Does not change Auth accounts; roster tag is app-side only.
 */
export function HrHeadOfficeAttendancePage() {
  return (
    <GroupAttendancePage
      title="Head Office Attendance"
      description="Time In / Time Out for Head Office staff (Samerah Sandigan). Includes all of her punches (HQ or clinic). Default dates match the current salary cut."
      branchIds={[HQ_SENTINEL_BRANCH_ID]}
      exportSlug="attendance-head-office"
      defaultRangeMode="pay_cut"
    />
  )
}

/** HR: attendance for one clinic (e.g. San Mateo Attendance). */
export function HrClinicAttendancePage() {
  const { branchId } = useParams<{ branchId: string }>()
  const { branches } = useBranch()

  if (branchId === HQ_SENTINEL_BRANCH_ID || branchId === 'head-office') {
    return <Navigate to="/admin/hr/attendance/head-office" replace />
  }

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
