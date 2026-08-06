import type { ReactNode } from "react"

/**
 * 副站区块标题（H2）：衬线 + 铜绿发丝线装饰（.galvelica-rule），与 .galvelica-h2 字号对齐。
 * 用于 work-detail 三处内联 <h2>+rule 的统一。
 */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="galvelica-h2">{children}</h2>
      <div className="galvelica-rule mt-2" />
    </div>
  )
}
