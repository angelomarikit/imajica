import { FRANCHISE_CLINIC_BRANCH_IDS } from '@/constants/teamAccountsSeed'
import { GroupAttendancePage } from '@/pages/attendance/GroupAttendancePage'

/** HQ: Dasmariñas & Bacoor franchise staff attendance. */
export function FranchiseAttendancePage() {
  return (
    <GroupAttendancePage
      title="Franchise Attendance"
      description="Time In / Time Out for franchise clinics: Dasmariñas and Bacoor."
      branchIds={[...FRANCHISE_CLINIC_BRANCH_IDS]}
      exportSlug="franchise-attendance"
    />
  )
}
