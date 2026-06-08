"use client"

import { logger } from "@/lib/logger"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.api.error("[ErrorBoundary]", error)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-card p-8 text-center ring-1 ring-border">
          <div className="mb-4 rounded-2xl bg-red-500/10 p-4">
            <AlertTriangle className="h-8 w-8 text-red-400" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-foreground">组件加载出错</h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {this.state.error?.message || "发生了未知错误，请尝试刷新页面"}
          </p>
          <button
            onClick={this.handleReset}
            className="mt-4 flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}