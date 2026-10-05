import { useState } from 'react'
import { BookOpen, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { SearchInput } from '@/components/ui/SearchInput'
import { HrRecruitmentPage } from '@/pages/hr/HrRecruitmentPage'

type Course = {
  id: string
  title: string
  category: string
  enrolled: number
  durationHours: number
  status: 'published' | 'draft'
}

const DEMO_COURSES: Course[] = []

export function RecruitmentLmsPage() {
  const [tab, setTab] = useState('recruitment')
  const [query, setQuery] = useState('')

  const courses = DEMO_COURSES.filter(
    (c) =>
      !query.trim() ||
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase()),
  )

  if (tab === 'recruitment') {
    return (
      <div className="space-y-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'recruitment', label: 'Recruitment' },
            { id: 'lms', label: 'Learning (LMS)' },
          ]}
        />
        <HrRecruitmentPage />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'recruitment', label: 'Recruitment' },
          { id: 'lms', label: 'Learning (LMS)' },
        ]}
      />

      <AdminPageBanner
        eyebrow="Team"
        title="Learning (LMS)"
        description="Track onboarding and continuing education courses across branches."
        actions={
          <Button
            variant="gold"
            onClick={() =>
              toast.message('New course form', {
                description: 'LMS course builder is coming next.',
              })
            }
          >
            <BookOpen className="h-4 w-4" /> New Course
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-800">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">LMS Courses</p>
            <p className="mt-1 font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">
              {DEMO_COURSES.length}
            </p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-800">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">Total Enrollments</p>
            <p className="mt-1 font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">
              {DEMO_COURSES.reduce((s, c) => s + c.enrolled, 0)}
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search courses..."
          className="mb-4 max-w-sm"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-ui">
              <tr className="border-b border-border">
                <th className="px-2 py-3">Course</th>
                <th className="px-2 py-3">Category</th>
                <th className="px-2 py-3">Enrolled</th>
                <th className="px-2 py-3">Duration</th>
                <th className="px-2 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-10 text-center text-slate-ui">
                    No LMS courses yet.
                  </td>
                </tr>
              ) : (
                courses.map((c) => (
                  <tr key={c.id} className="border-t border-border/70 hover:bg-ivory-100">
                    <td className="px-2 py-3 font-semibold text-[#073D2C]">{c.title}</td>
                    <td className="px-2 py-3">{c.category}</td>
                    <td className="px-2 py-3">{c.enrolled}</td>
                    <td className="px-2 py-3">{c.durationHours}h</td>
                    <td className="px-2 py-3">
                      <Badge variant={c.status === 'published' ? 'success' : 'neutral'} className="capitalize">
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
