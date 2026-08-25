"use client"

import { useEffect } from "react"

/**
 * 全局点击水波控制器（首页视觉任务 · 第4项）。
 *
 * 设计约束（来自需求）：
 * - 中性灰、低透明度、接近文字色 —— 不随后台主题色变化，故用 color-mix(var(--foreground) …)。
 * - 从指针按下位置生成小圆点，水波状向外扩散到约 1.6× 后淡出。
 * - 贴着控件自身形状收尾 —— 宿主必须 overflow:hidden + position:relative（由 CSS [data-ripple] 提供）。
 * - 游戏卡片特殊：水波只在「内容区」清晰；封面区几乎不可见。做法：卡片根挂 data-ripple，
 *   并指定 data-ripple-target=".game-card-body"，水波实际宿主是内容区；当点击落在内容区上方
 *   （即封面区）时，把起点 y 钳到内容区顶边，使水波从内容区顶部涌入。
 *
 * 不引入任何动画库；水波只是叠加在既有悬停/按压反馈之上的额外点击反馈。
 */
export function RippleController() {
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.("[data-ripple]") as HTMLElement | null
      if (!target) return

      const region = target.getAttribute("data-ripple-target")
      const host = (region ? target.querySelector(region) : target) as HTMLElement | null
      if (!host) return

      const rect = host.getBoundingClientRect()
      let x = e.clientX - rect.left
      let y = e.clientY - rect.top

      // 点击落在宿主上方（如游戏卡片封面区）：水波从内容区顶部进入，封面区不显
      if (y < 0) y = 0

      const dx = Math.max(x, rect.width - x)
      const dy = Math.max(y, rect.height - y)
      const radius = Math.hypot(dx, dy)
      const finalR = radius * 1.6 // 扩散到约 1.6×（以到最远角为基准，确保覆盖控件后仍溢出一点）
      const size = finalR * 2

      const span = document.createElement("span")
      span.className = "ripple-wave"
      span.style.left = `${x}px`
      span.style.top = `${y}px`
      span.style.width = `${size}px`
      span.style.height = `${size}px`
      host.appendChild(span)
      span.addEventListener(
        "animationend",
        () => span.remove(),
        { once: true },
      )
    }

    document.addEventListener("pointerdown", onPointerDown, { passive: true })
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  return null
}
