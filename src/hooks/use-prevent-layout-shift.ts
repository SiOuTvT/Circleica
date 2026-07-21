"use client"

import { useEffect } from "react"

/**
 * 防止 Radix Dialog 打开时页面偏移
 * react-remove-scroll 给 body 加 margin-right 补偿滚动条消失，
 * 但 scrollbar-gutter: stable 已经预留了空间，导致双重补偿。
 * 用 MutationObserver 强制清除注入的 margin。
 */
export function usePreventLayoutShift() {
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.hasAttribute("data-scroll-locked")) {
        document.body.style.marginRight = "0px"
        document.body.style.paddingRight = "0px"
      }
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked", "style"],
    })

    return () => observer.disconnect()
  }, [])
}
