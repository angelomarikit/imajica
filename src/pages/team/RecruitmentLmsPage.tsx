import { useMemo, useState } from 'react'
import { GraduationCap, BookOpen, UserPlus, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { SearchInput } from '@/components/ui/SearchInput'

type Applicant = {
  id: string
  name: string
  role: string
  branch: string
  status: 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
  appliedAt: string
}

type Course = {
  id: string
  title: string
  category: string
  enrolled: number
  durationHours: number
  status: 'published' | 'draft'
}

const DEMO_APPLICANTS: Applicant[] = []

const DEMO_COURSES: Course[] = []

const statusVariant: Record<Applicant['status'], 'info' | 'warning' | 'gold' | 'success' | 'danger'> = {
  screening: 'info',
  interview: 'warning',
  offer: 'gold',
  hired: 'success',
  rejected: 'danger',
}

export function RecruitmentLmsPage() {
  const [tab, setTab] = useState('recruitment')
  const [query, setQuery] = useState('')

  const applicants = useMemo(() => {
    const q = query.toLowerCase()
    return DEMO_APPLICANTS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.branch.toLowerCase().includes(q),
    )
  }, [query])

  const courses = useMemo(() => {
    const q = query.toLowerCase()
    return DEMO_COURSES.filter(
      (c) => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div className="space-y-5">
      <AdminPageBanner
        eyebrow="Team"
        title="Recruitment & LMS"
        description="Hire clinical and support talent, then track onboarding and continuing education across branches."
        actions={
          <Button
            variant="gold"
            onClick={() =>
              toast.message(tab === 'recruitment' ? 'New applicant form' : 'New course form', {
                description: 'Will persist to Supabase when connected.',
              })
            }
          >
            {tab === 'recruitment' ? (
              <>
                <UserPlus className="h-4 w-4" /> Add Applicant
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4" /> New Course
              </>
            )}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">Open Pipeline</p>
            <p className="mt-1 font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">{DEMO_APPLICANTS.length}</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-800">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-ui">LMS Courses</p>
            <p className="mt-1 font-metric text-2xl font-semibold tracking-tight text-[#073D2C]">{DEMO_COURSES.length}</p>
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
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'recruitment', label: 'Recruitment' },
            { id: 'lms', label: 'Learning (LMS)' },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={tab === 'recruitment' ? 'Search applicants...' : 'Search courses...'}
          className="my-4 max-w-sm"
        />

        {tab === 'recruitment' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-ui">
                <tr className="border-b border-border">
                  <th className="px-2 py-3">Applicant</th>
                  <th className="px-2 py-3">Role</th>
                  <th className="px-2 py-3">Branch</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">Applied</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((a) => (
                  <tr key={a.id} className="border-t border-border/70 hover:bg-ivory-100">
                    <td className="px-2 py-3 font-semibold text-[#073D2C]">{a.name}</td>
                    <td className="px-2 py-3">{a.role}</td>
                    <td className="px-2 py-3">{a.branch}</td>
                    <td className="px-2 py-3">
                      <Badge variant={statusVariant[a.status]} className="capitalize">
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-slate-ui">{a.appliedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
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
                {courses.map((c) => (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
