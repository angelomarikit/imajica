import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useBranch } from '@/contexts/BranchContext'
import { csrLookupPatients, type CsrPatientHit } from '@/services/csrMarketingService'

const fieldLabel = 'mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal'
const fieldControl =
  'h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-charcoal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'

export function CsrPatientLookupPage() {
  const { selectedBranchId, selectedBranch } = useBranch()
  const branchId = selectedBranchId !== 'all' ? selectedBranchId : undefined
  const [phone, setPhone] = useState('')
  const [hits, setHits] = useState<CsrPatientHit[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    if (!phone.trim()) {
      toast.error('Enter a mobile number')
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const rows = await csrLookupPatients(phone.trim(), branchId || null)
      setHits(rows)
      if (!rows.length) toast.message('No patient found for this mobile')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lookup failed')
      setHits([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-emerald-800" />
          <h1 className="text-xl font-bold text-charcoal">Patient Lookup</h1>
        </div>
        <p className="mt-1 text-sm text-slate-ui">
          Search by mobile only. Results show name, masked phone, and new/existing status — no
          medical notes, photos, or payments.
          {selectedBranch ? ` Scoped for ${selectedBranch.name}.` : ''}
        </p>
      </div>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <label className="block min-w-[14rem] flex-1">
          <span className={fieldLabel}>Mobile number</span>
          <input
            className={fieldControl}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09XXXXXXXXX"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSearch()
            }}
          />
        </label>
        <Button type="button" disabled={loading} onClick={() => void handleSearch()}>
          <Search className="mr-1.5 h-4 w-4" />
          {loading ? 'Searching…' : 'Search'}
        </Button>
        <Link to="/admin/csr/book">
          <Button type="button" variant="secondary">
            Book Appointment
          </Button>
        </Link>
      </Card>

      <Card className="overflow-hidden">
        {!searched ? (
          <p className="p-6 text-sm text-slate-ui">Enter a mobile number to identify new vs existing patients.</p>
        ) : hits.length === 0 ? (
          <div className="space-y-3 p-6">
            <p className="text-sm text-slate-ui">No match. You can create a limited registration during booking.</p>
            <Link to="/admin/csr/book">
              <Button type="button">Start booking as new patient</Button>
            </Link>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-cream/80 text-[11px] font-bold uppercase tracking-wide text-charcoal">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Patient ID</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hits.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-3 font-medium text-charcoal">{h.fullName}</td>
                  <td className="px-4 py-3 text-slate-ui">{h.phoneMasked}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        h.isExisting ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'
                      }
                    >
                      {h.isExisting ? 'Existing' : 'On file / new to clinic'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-ui">{h.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-right">
                    <Link to="/admin/csr/book">
                      <Button size="sm" type="button">
                        Book
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
