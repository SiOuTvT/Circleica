import type { ReactNode } from "react"

/**
 * 副站区块标题（H2）：衬线标题 + 右侧 1px 直线延伸到内容边缘。
 * 不用 .galvelica-rule 的渐变装饰线（副站新语言只有发丝直线）。
 */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="galvelica-section-title">
      <h2 className="galvelica-h2">{children}</h2>
      <span className="galvelica-section-title-line" aria-hidden />
    </div>
  )
}
