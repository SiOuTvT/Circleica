"use client"

import { useEffect } from "react"

/**
 * 防止 Radix Dialog 打开时页面偏移
 * react-remove-scroll 通过 <style> 标签给 body 加 margin-right，
 * CSS !important 打不过动态注入的样式。用 JS 强制清除。
 */
export function LayoutShiftGuard() {
  useEffect(() => {
    let raf: number | null = null

    const fix = () => {
      if (document.body.hasAttribute("data-scroll-locked")) {
        if (document.body.style.marginRight !== "0px") {
          document.body.style.setProperty("margin-right", "0px", "important")
        }
        if (document.body.style.paddingRight !== "0px") {
          document.body.style.setProperty("padding-right", "0px", "important")
        }
      }
    }

    // 监听属性变化
    const observer = new MutationObserver(() => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(fix)
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked", "style"] })

    // 兜底：定期检查（防止 MutationObserver 漏掉）
    const interval = setInterval(fix, 100)

    return () => {
      observer.disconnect()
      clearInterval(interval)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return null
}
