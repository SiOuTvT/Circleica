"use client"

import { useEffect } from "react"

/**
 * 防止 Radix Dialog 打开时页面偏移
 * 用 MutationObserver 强制清除 react-remove-scroll 注入的 margin
 */
export function LayoutShiftGuard() {
  useEffect(() => {
    const fix = () => {
      if (document.body.hasAttribute("data-scroll-locked")) {
        document.body.style.marginRight = "0px"
        document.body.style.paddingRight = "0px"
      }
    }
    const observer = new MutationObserver(fix)
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked", "style"] })
    return () => observer.disconnect()
  }, [])

  return null
}
