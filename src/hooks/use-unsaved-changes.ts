"use client"

import { useEffect } from "react"

/**
 * 未保存离开保护
 * 当 hasChanges 为 true 时，刷新/关闭页面会触发浏览器确认提示
 */
export function useUnsavedChanges(hasChanges: boolean) {
  useEffect(() => {
    if (!hasChanges) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [hasChanges])
}
