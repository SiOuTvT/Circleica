"use client"

import { useEffect } from "react"

/**
 * 全局点击反馈控制器（首页视觉任务 · 第4项增强版）。
 *
 * 三段式手感：
 *  1) 按下（pointerdown，零延迟）：控件整体缩到 97% + 表面略变深，按住期间保持。
 *     这一下在跳转发生前就完整呈现，是「实感」的来源 —— 即使随后页面跳转把水波后半
 *     段截掉，按下这半段也必须被看到。
 *  2) 松手（pointerup / pointercancel）：约 200ms 先快后慢回弹到原大小，与水波同步展开。
 *  3) 水波：中性灰、低透明度、接近文字色（不随后台主题色变化），从按下位置向外撑开到
 *     约 1.6× 后于中后段淡出，贴控件形状收尾。
 *
 * 游戏卡片特殊：控件是整张卡片（按下整卡下沉），但水波实际宿主是内容区 .game-card-body，
 * 封面区不显水波；点击落在封面区时把水波起点钳到内容区顶边，使其只从内容区涌入。
 *
 * 不引入任何动画库；不改动既有悬停效果，只叠加点击反馈。
 */
export function RippleController() {
  useEffect(() => {
    // 按指针 id 记录当前被按下的控件，确保「在控件外松开」也能正确回弹
    const pressed = new Map<number, HTMLElement>()

    const spawnRipple = (host: HTMLElement, e: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      const x = e.clientX - rect.left
      let y = e.clientY - rect.top

      // 点击落在宿主上方（如游戏卡片封面区）：水波从内容区顶部进入，封面区不显
      if (y < 0) y = 0

      const dx = Math.max(x, rect.width - x)
      const dy = Math.max(y, rect.height - y)
      const radius = Math.hypot(dx, dy)
      const size = radius * 1.6 * 2 // 扩散到约 1.6×（以到最远角为基准）

      const span = document.createElement("span")
      span.className = "ripple-wave"
      span.style.left = `${x}px`
      span.style.top = `${y}px`
      span.style.width = `${size}px`
      span.style.height = `${size}px`
      host.appendChild(span)
      span.addEventListener("animationend", () => span.remove(), { once: true })
    }

    const onPointerDown = (e: PointerEvent) => {
      const control = (e.target as HTMLElement | null)?.closest?.("[data-ripple]") as HTMLElement | null
      if (!control) return

      // 按下：立即下沉 + 变深（ripple-pressed 的 transition 为 0ms，几乎零延迟）
      control.classList.add("ripple-pressed")
      control.classList.remove("ripple-release")
      pressed.set(e.pointerId, control)

      const region = control.getAttribute("data-ripple-target")
      const host = (region ? control.querySelector(region) : control) as HTMLElement | null
      if (host) spawnRipple(host, e)
    }

    const releaseControl = (control: HTMLElement) => {
      // 松手：移除 pressed 并挂上 release，由 CSS 的 200ms 缓动回弹
      control.classList.remove("ripple-pressed")
      control.classList.add("ripple-release")
      // 兜底清理：略大于回弹时长，避免 transitionend 偶发未触发而残留 class
      window.setTimeout(() => control.classList.remove("ripple-release"), 260)
    }

    const onPointerUp = (e: PointerEvent) => {
      const control = pressed.get(e.pointerId)
      if (control) {
        releaseControl(control)
        pressed.delete(e.pointerId)
      }
    }

    document.addEventListener("pointerdown", onPointerDown, { passive: true })
    document.addEventListener("pointerup", onPointerUp, { passive: true })
    document.addEventListener("pointercancel", onPointerUp, { passive: true })
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("pointerup", onPointerUp)
      document.removeEventListener("pointercancel", onPointerUp)
    }
  }, [])

  return null
}
