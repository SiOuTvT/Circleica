"use client"

import { useEffect, useRef } from "react"
import type { App } from "vue"

/**
 * Vue-React Bridge
 * Mounts a Vue 3 app with Naive UI components inside a React component.
 *
 * Usage:
 *   <VueReactBridge
 *     createApp={(container) => {
 *       const { createApp, h } = require('vue')
 *       const app = createApp({ render: () => h(MyVueComponent, props) })
 *       app.mount(container)
 *       return app
 *     }}
 *   />
 */
interface VueReactBridgeProps {
  /** Function that creates and mounts a Vue app, returns the app instance */
  createApp: (container: HTMLDivElement) => App
  /** Optional className for the container div */
  className?: string
  /** Optional style for the container div */
  style?: React.CSSProperties
}

export function VueReactBridge({ createApp, className, style }: VueReactBridgeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<App | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Mount Vue app
    const app = createApp(containerRef.current)
    appRef.current = app

    return () => {
      // Cleanup: unmount Vue app when React component unmounts
      if (appRef.current) {
        try {
          appRef.current.unmount()
        } catch (e) {
          // Ignore unmount errors
        }
        appRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className={className} style={style} />
}