"use client"

import { useEffect } from "react"

/**
 * 兜底：防止 Radix Dialog 打开时整页偏移。
 * react-remove-scroll 给 <body> 加 data-scroll-locked 属性并注入带 !important 的补偿样式
 * （margin-right/padding = 滚动条宽、position:relative）。globals.css 已用更高优先级的
 * `html body[data-scroll-locked]` 选择器中和；此处用 inline !important 再做一层兜底，
 * 确保覆盖库动态注入的样式（inline !important 高于任何样式表规则）。
 */
export function LayoutShiftGuard() {
  useEffect(() => {
    let raf: number | null = null

    const fix = () => {
      // 真实信号是 data-scroll-locked 属性（非 .body-scroll-locked 类）
      const locked = document.body.hasAttribute("data-scroll-locked")
      if (locked) {
        const b = document.body
        b.style.setProperty("margin-right", "0px", "important")
        b.style.setProperty("padding-right", "0px", "important")
        b.style.setProperty("padding-left", "0px", "important")
        b.style.setProperty("padding-top", "0px", "important")
        b.style.setProperty("position", "static", "important")
        const de = document.documentElement
        de.style.setProperty("margin-right", "0px", "important")
        de.style.setProperty("padding-right", "0px", "important")
      }
    }

    // 监听属性（data-scroll-locked 是属性）+ style 变化
    const observer = new MutationObserver(() => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(fix)
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked", "style"] })

    // 兜底：定期检查（防止 MutationObserver 漏掉）
    const interval = setInterval(fix, 200)

    return () => {
      observer.disconnect()
      clearInterval(interval)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return null
}
