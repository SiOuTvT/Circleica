"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

/** 右缘渐隐遮罩（单行横向滚动时用），遮住 28px 提示还有内容可滑 */
const FADE_MASK =
  "linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent 100%)"

/**
 * 标签行。
 *
 * 默认模式：自由换行，最多显示 2 行；超出部分折叠为「+N 更多标签」。
 * 为什么需要测量：纯 CSS 无法对 flex-wrap 容器做「多行裁剪并补 +N」，
 * 因此这里在首次布局时测量子元素 offsetTop，找出落入第 3 行起的标签并裁掉。
 * 与左列封面卡配合时，能防止标签过多把左列撑高、破坏左右等高。
 *
 * singleLine 模式：绝不换行，一行排完，超出横向滚动（右缘渐隐提示）。
 * 用于游戏详情页首屏资源标签 —— 那一行必须保持单行，否则会把左列撑高。
 */
export function TagRow({
  children,
  className,
  singleLine = false,
}: {
  children: ReactNode
  className?: string
  /** 单行模式：不换行、不折叠、横向滚动 + 右缘渐隐 */
  singleLine?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<"measure" | "done">("measure")
  const [limit, setLimit] = useState(0)
  const [extra, setExtra] = useState(0)

  useLayoutEffect(() => {
    if (singleLine) return
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
  }, [phase, children, singleLine])

  const baseClass = `flex items-center gap-1 sm:gap-1.5 ${singleLine ? "flex-nowrap overflow-x-auto scrollbar-thin" : "flex-wrap"} ${className ?? ""}`

  if (singleLine) {
    return (
      <div ref={ref} className={baseClass} style={{ maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}>
        {children}
      </div>
    )
  }

  const items = Array.isArray(children) ? children : [children]

  if (phase === "measure") {
    return (
      <div ref={ref} className={baseClass}>
        {children}
      </div>
    )
  }

  return (
    <div className={baseClass}>
      {items.slice(0, limit)}
      {extra > 0 && (
        <span className="inline-flex items-center shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-semibold leading-none text-muted-foreground">
          +{extra} 更多
        </span>
      )}
    </div>
  )
}
