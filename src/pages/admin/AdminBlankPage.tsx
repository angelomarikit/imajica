import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Card } from '@/components/ui/Card'

/** Placeholder for pages not yet fully built */
export function AdminBlankPage({
  title,
  description,
  eyebrow = 'Administration',
}: {
  title: string
  description?: string
  eyebrow?: string
}) {
  return (
    <div className="space-y-5">
      <AdminPageBanner
        eyebrow={eyebrow}
        title={title}
        description={description ?? 'This section is reserved for the next build.'}
      />
      <Card className="p-10 text-center text-sm text-slate-ui">
        Page coming soon. Schema and navigation are ready — content will be added next.
      </Card>
    </div>
  )
}
