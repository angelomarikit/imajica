import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminPageBanner } from '@/components/ui/AdminPageBanner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { BRANCH_TYPES, createBranch } from '@/services/branchService'
import { cn } from '@/utils/cn'

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-border bg-white px-3.5 py-2.5 text-sm text-[#073D2C] placeholder:text-slate-400 outline-none focus:border-emerald-800/40 focus:ring-2 focus:ring-emerald-900/10'

const labelClass = 'text-sm font-medium text-[#073D2C]'

export function NewBranchPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [branchType, setBranchType] = useState('')
  const [address, setAddress] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim()) {
      toast.error('Branch code and name are required')
      return
    }
    if (!branchType) {
      toast.error('Select a branch type')
      return
    }
    createBranch({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      branchType: branchType as 'company_owned' | 'franchise' | 'warehouse',
      address: address.trim() || '—',
      phone: '',
      email: '',
      status: 'active',
      isMain: false,
      treatmentRooms: 0,
      consultationRooms: 0,
      waitingAreas: 0,
      parkingAvailable: false,
      staffCount: 0,
    })
    toast.success('Branch added (demo)', {
      description: 'Persists to public.branches when Supabase is connected.',
    })
    navigate('/admin/team/branches')
  }

  return (
    <div className="space-y-5">
      <AdminPageBanner
        title={<span className="text-[#C5A059]">Create New Branch</span>}
        description="Establish a new franchise or company-owned clinic branch location."
        actions={
          <Link to="/admin/team/branches">
            <Button
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Back to List
            </Button>
          </Link>
        }
      />

      <Card className="mx-auto max-w-4xl p-6 sm:p-8">
        <div className="mb-5 border-b border-border pb-4">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">Branch Information</h2>
          <p className="mt-1 text-sm text-slate-ui">
            Specify branch credentials, type, and geographic address.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Branch Code</span>
              <input
                className={fieldClass}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Branch Code"
                required
              />
            </label>
            <label className="block">
              <span className={labelClass}>Branch Name</span>
              <input
                className={fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Branch Name"
                required
              />
            </label>
            <label className="block sm:col-span-2 sm:max-w-md">
              <span className={labelClass}>Branch Type</span>
              <select
                className={cn(fieldClass, !branchType && 'text-slate-400')}
                value={branchType}
                onChange={(e) => setBranchType(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select Type
                </option>
                {BRANCH_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="text-[#073D2C]">
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Address</span>
              <textarea
                className={cn(fieldClass, 'min-h-[110px] resize-y')}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full Address"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/team/branches')}>
              Cancel
            </Button>
            <Button type="submit">Add Branch</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
