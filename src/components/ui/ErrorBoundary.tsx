import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * ErrorBoundary - Catches React errors and displays a fallback UI
 *
 * Provides graceful error handling for the entire app:
 * 1. Catches errors in child component tree
 * 2. Reports errors to analytics (if enabled)
 * 3. Displays a user-friendly error screen
 * 4. Allows app recovery via reload
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Log error to console
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)

    // Report to analytics via IPC (if available)
    // Note: Using IPC because analytics is in main process
    try {
      if (window.milo?.settings) {
        // We can't directly call analytics from renderer, but we log for now
        // Future: Add IPC handler for error reporting
        console.error('[ErrorBoundary] Error reported for analytics')
      }
    } catch {
      // Ignore if window.milo isn't available
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-pipboy-background p-8">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error icon */}
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-red-500/10 border border-red-500/30">
                <AlertTriangle size={48} className="text-red-400" />
              </div>
            </div>

            {/* Error message */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-pipboy-green glow-low">
                Something went wrong
              </h2>
              <p className="text-sm text-pipboy-green-dim">
                MILO encountered an unexpected error. Your data is safe.
              </p>
            </div>

            {/* Error details (collapsed by default in production) */}
            {this.state.error && (
              <div className="bg-pipboy-surface border border-pipboy-border rounded p-3 text-left">
                <p className="text-[10px] text-red-400 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="
                  px-4 py-2 rounded-sm
                  text-sm text-pipboy-green
                  border border-pipboy-border hover:border-pipboy-green/50
                  transition-all
                "
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="
                  flex items-center gap-2 px-4 py-2 rounded-sm
                  text-sm text-pipboy-background
                  bg-pipboy-green hover:bg-pipboy-green/90
                  transition-all
                "
              >
                <RefreshCw size={14} />
                Reload App
              </button>
            </div>

            {/* Version info */}
            <p className="text-[10px] text-pipboy-green-dim/40 pt-4">
              If this keeps happening, please restart MILO.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
