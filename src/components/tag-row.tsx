"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

/**
 * 标签行 — 自由换行，最多显示 2 行；超出部分折叠为「+N 更多标签」。
 *
 * 为什么需要测量：纯 CSS 无法对 flex-wrap 容器做「多行裁剪并补 +N」，
 * 因此这里在首次布局时测量子元素 offsetTop，找出落入第 3 行起的标签并裁掉。
 * 与左列封面卡配合时，能防止标签过多把左列撑高、破坏左右等高。
 */
export function TagRow({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<"measure" | "done">("measure")
  const [limit, setLimit] = useState(0)
  const [extra, setExtra] = useState(0)

  useLayoutEffect(() => {
    if (phase !== "measure") return
    const el = ref.current
    if (!el) {
      setPhase("done")
      return
    }
    const kids = Array.from(el.children) as HTMLElement[]
    if (kids.length === 0) {
      setPhase("done")
      return
    }
    const top0 = kids[0].offsetTop
    const h0 = kids[0].offsetHeight
    // 两行高度 + 容差：超过即进入第 3 行
    const edge = top0 + h0 * 2 + 6
    let count = kids.length
    for (let i = 0; i < kids.length; i++) {
      if (kids[i].offsetTop > edge) {
        count = i
        break
      }
    }
    if (count < kids.length) {
      setExtra(kids.length - count)
    }
    setLimit(count)
    setPhase("done")
  }, [phase, children])

  const items = Array.isArray(children) ? children : [children]

  if (phase === "measure") {
    return (
      <div ref={ref} className={`flex flex-wrap items-center gap-1 sm:gap-1.5 ${className ?? ""}`}>
        {children}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 sm:gap-1.5 ${className ?? ""}`}>
      {items.slice(0, limit)}
      {extra > 0 && (
        <span className="inline-flex items-center shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-semibold leading-none text-muted-foreground">
          +{extra} 更多
        </span>
      )}
    </div>
  )
}
