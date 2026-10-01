import { BRANCH_IDS } from '@/constants/teamAccountsSeed'
import { GroupAttendancePage } from '@/pages/attendance/GroupAttendancePage'

const COMPANY_BRANCH_IDS = [
  BRANCH_IDS.sanMateo,
  BRANCH_IDS.cainta,
  BRANCH_IDS.pasig,
  BRANCH_IDS.lipa,
]

/** HQ: San Mateo, Cainta, Pasig, Lipa staff attendance. */
export function BranchesAttendancePage() {
  return (
    <GroupAttendancePage
      title="Branches Attendance"
      description="Time In / Time Out for company-owned clinics: San Mateo, Cainta, Pasig, and Lipa."
      branchIds={COMPANY_BRANCH_IDS}
      exportSlug="branches-attendance"
    />
  )
}
