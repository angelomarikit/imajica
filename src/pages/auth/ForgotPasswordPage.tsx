import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
      toast.success('Password reset link sent (or queued in demo mode)')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ivory px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-[16px] border border-border bg-white p-8 shadow-lg">
        <h1 className="font-display text-3xl">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-ui">Enter your email and we’ll send reset instructions.</p>
        {sent ? (
          <p className="mt-6 rounded-[10px] bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            Check your inbox for a reset link. You can close this page.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            <Input label="Email" type="email" leftIcon={<Mail className="h-4 w-4" />} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </div>
        )}
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-gold hover:underline">
          ← Back to sign in
        </Link>
      </form>
    </div>
  )
}

export function ResetPasswordPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-ivory px-4">
      <div className="w-full max-w-md rounded-[16px] border border-border bg-white p-8 shadow-lg">
        <h1 className="font-display text-3xl">Reset password</h1>
        <p className="mt-2 text-sm text-slate-ui">
          Open the link from your email to set a new password. In demo mode, sign in with the demo credentials.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-gold hover:underline">
          ← Back to sign in
        </Link>
      </div>
    </div>
  )
}
