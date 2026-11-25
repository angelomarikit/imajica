import { BookingPipelineSummary } from '@/components/marketing/BookingPipelineSummary'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'

export function CsrBookingsPage() {
  return (
    <div className="space-y-5">
      <AdminPageBanner
        eyebrow="CSR Scheduling"
        title="Bookings"
        description="Total bookings for each assigned clinic, and how many of those clients are new versus returning."
      />
      <BookingPipelineSummary pipelinePath="/admin/csr/pipeline" />
    </div>
  )
}
