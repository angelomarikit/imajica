import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** Keeps admin chrome (sidebar/header) visible when a page throws. */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PageErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">
            Something went wrong
          </p>
          <h2 className="mt-2 font-display text-2xl text-[#073D2C]">This page could not load</h2>
          <p className="mt-2 text-sm text-slate-600">
            {this.state.error.message || 'An unexpected error occurred while rendering this screen.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
            <Button type="button" variant="secondary" onClick={() => window.location.assign('/admin/dashboard')}>
              Back to dashboard
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
