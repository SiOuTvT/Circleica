"use client"

import { useEffect } from "react"

/**
 * 未保存离开保护
 * 当 hasChanges 为 true 时：
 * - 刷新/关闭页面 → 浏览器确认提示 (beforeunload)
 * - 浏览器后退/前进 → Next.js 路由拦截 (beforePopState)
 */
export function useUnsavedChanges(hasChanges: boolean) {
  useEffect(() => {
    if (!hasChanges) return

    // 浏览器刷新/关闭
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    // 浏览器后退/前进按钮
    const beforePopState = () => {
      if (window.confirm("有未保存的更改，确定要离开吗？")) {
        return true
      }
      window.history.pushState(window.history.state, "")
      return false
    }

    window.addEventListener("beforeunload", beforeUnload)
    window.addEventListener("popstate", beforePopState)
    window.history.pushState(window.history.state, "")

    return () => {
      window.removeEventListener("beforeunload", beforeUnload)
      window.removeEventListener("popstate", beforePopState)
    }
  }, [hasChanges])
}
