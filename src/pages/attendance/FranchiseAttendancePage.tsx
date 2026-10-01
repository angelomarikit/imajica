import { BRANCH_IDS } from '@/constants/teamAccountsSeed'
import { GroupAttendancePage } from '@/pages/attendance/GroupAttendancePage'

const FRANCHISE_BRANCH_IDS = [BRANCH_IDS.dasma, BRANCH_IDS.bacoor]

/** HQ: Dasmariñas & Bacoor franchise staff attendance. */
export function FranchiseAttendancePage() {
  return (
    <GroupAttendancePage
      title="Franchise Attendance"
      description="Time In / Time Out for franchise clinics: Dasmariñas and Bacoor."
      branchIds={FRANCHISE_BRANCH_IDS}
      exportSlug="franchise-attendance"
    />
  )
}
