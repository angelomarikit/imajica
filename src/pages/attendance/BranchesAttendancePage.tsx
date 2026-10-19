import { COMPANY_OWNED_BRANCH_IDS } from '@/constants/teamAccountsSeed'
import { GroupAttendancePage } from '@/pages/attendance/GroupAttendancePage'

/** HQ: San Mateo, Pasig, Lipa, Cainta staff attendance. */
export function BranchesAttendancePage() {
  return (
    <GroupAttendancePage
      title="Branches Attendance"
      description="Time In / Time Out for company-owned clinics: San Mateo, Pasig, Lipa, and Cainta."
      branchIds={[...COMPANY_OWNED_BRANCH_IDS]}
      exportSlug="branches-attendance"
    />
  )
}
