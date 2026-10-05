import { useParams } from 'react-router-dom'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Card } from '@/components/ui/Card'

const MODULES: Record<string, { title: string; description: string }> = {
  salary: {
    title: 'Salary',
    description: 'Clinic-wide salary structures, rates, and payroll runs across all branches.',
  },
}

export function HrModulePage() {
  const { module = '' } = useParams<{ module: string }>()
  const meta = MODULES[module] ?? {
    title: 'HR Module',
    description: 'Human resources module for all clinics.',
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner title={meta.title} description={meta.description} />
      <Card className="p-8 text-center sm:p-10">
        <p className="text-sm text-slate-ui">
          This HR module is ready for the next build — screens, workflows, and Supabase tables will
          land here for all branches.
        </p>
      </Card>
    </div>
  )
}
