"use client"

import { useEffect, useRef } from "react"

/**
 * 移动端输入框聚焦自动滚动 — 防止软键盘遮挡
 *
 * 用法：在页面/组件顶层调用
 *   useInputFocusScroll()
 *
 * 原理：监听 focusin 事件，延迟 300ms（等键盘弹出）后
 *   调用 scrollIntoView 将输入框滚动到可视区域中央
 */
export function useInputFocusScroll() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches
    if (!hasCoarsePointer) return

    function handleFocusIn(e: FocusEvent) {
      const target = e.target as HTMLElement
      if (!target) return

      const tag = target.tagName.toLowerCase()
      const isInput = tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable
      if (!isInput) return

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 300)
    }

    document.addEventListener("focusin", handleFocusIn)
    return () => {
      document.removeEventListener("focusin", handleFocusIn)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])
}