import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * 可点人名链接的统一规格（图鉴「按作品」卡班底、制作组/创作者详情页参与名单等）。
 *
 * 约定（与产品口径一致）：
 *  - 14px / 字重 500 / 前景实色（与卡片标题同档），悬停变主色（不加下划线）；
 *  - 不靠底色、边框、图标或常态下划线来区分，只靠字号、字重、颜色三者。
 *  - 不可点的说明文字（职位标签 / 年份 / 统计数字）保持 12px 灰，不要动。
 *
 * 注意：不要在此挂 data-ripple —— 其 CSS 会 position:relative+overflow:hidden，
 * 会裁掉外层需要的拉伸覆盖层。需要抬到覆盖层之上时，由调用方传 className="relative z-10"。
 */
export const PERSON_LINK_CLASS =
  "text-[14px] font-medium text-foreground hover:text-primary transition-colors duration-200"

export function PersonLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link href={href} className={cn(PERSON_LINK_CLASS, className)}>
      {children}
    </Link>
  )
}
