import { useEffect } from "react"

/**
 * 当组件挂载时锁定 body 滚动，卸载时恢复。
 * 防止弹窗/模态框背后的页面滚动。
 *
 * 使用 classList 而非 inline style，确保：
 * 1. CSS !important 规则始终生效（body 默认 overflow: auto !important）
 * 2. 多实例并发安全（引用计数）
 * 3. 即使 cleanup 异常也能通过页面刷新自动恢复
 */
let lockCount = 0

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const body = document.body

    lockCount++
    body.classList.add("body-scroll-locked")

    return () => {
      lockCount--
      if (lockCount <= 0) {
        lockCount = 0
        body.classList.remove("body-scroll-locked")
      }
    }
  }, [active])
}
