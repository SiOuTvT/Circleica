import type { ReactNode } from "react"
import { cjkSpace } from "@/lib/text"

interface CjkProps {
  children: ReactNode
  className?: string
}

/**
 * 渲染时对子文本做中英文混排间距处理（P2-7）。
 * 仅作用于字符串子节点；非字符串子节点原样透传。
 */
export function Cjk({ children, className }: CjkProps) {
  if (typeof children !== "string") {
    return <span className={className}>{children}</span>
  }
  return <span className={className}>{cjkSpace(children)}</span>
}
