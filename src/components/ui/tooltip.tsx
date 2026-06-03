"use client"

import { cn } from "@/lib/utils"
import { ReactNode, useState } from "react"

/**
 * 轻量 Tooltip 组件
 *
 * 用法：<Tooltip content="这是提示文字"><button>hover 我</button></Tooltip>
 */
export function Tooltip({
  content,
  children,
  className,
}: {
  content: string
  children: ReactNode
  className?: string
}) {
  const [show, setShow] = useState(false)

  if (!content) return <>{children}</>

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[9999] whitespace-nowrap rounded-lg bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          role="tooltip"
        >
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <span className="block w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-zinc-800" />
          </span>
        </span>
      )}
    </span>
  )
}
