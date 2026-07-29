import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ArchiveDensity } from "./density"

interface ArchiveShellProps {
  /** Archive 浏览体系实体（仅 studio / creator / collection，不含 Game Detail） */
  entity: "studio" | "creator" | "collection"
  /** 密度三态：驱动 CSS 令牌 --archive-density 与组件内布局 */
  density: ArchiveDensity
  breadcrumb?: ReactNode
  /** ArchiveHero 区域 */
  header?: ReactNode
  /** 搜索 / 排序 / 筛选工具条 */
  toolbar?: ReactNode
  /** AZIndex 等索引导航 */
  index?: ReactNode
  /** 主内容：网格 / 分区 */
  children: ReactNode
  /** 分页 */
  pager?: ReactNode
  className?: string
}

/**
 * ArchiveShell — 档案馆骨架（Framework，仅 Archive 浏览体系继承）
 *
 * 结构槽位：breadcrumb → header(Hero) → toolbar → index(AZIndex) → main → pager。
 * 注入 data-archive-entity / data-density / CSS 变量 --archive-density，供子组件
 * 与 CSS 级密度适配读取。
 *
 * ⚠️ 架构边界：ArchiveShell 只服务于 Studio / Creator / Collection（及未来扩展）。
 * Game Detail 永不进入此框架，亦不反向改造本组件以兼容 Game Detail。
 */
export function ArchiveShell({
  entity,
  density,
  breadcrumb,
  header,
  toolbar,
  index,
  children,
  pager,
  className,
}: ArchiveShellProps) {
  const style = { "--archive-density": density } as CSSProperties
  return (
    <div data-archive-entity={entity} data-density={density} style={style} className={cn("space-y-6", className)}>
      {breadcrumb && <div className="text-sm">{breadcrumb}</div>}
      {header && <div>{header}</div>}
      {toolbar && <div>{toolbar}</div>}
      {index && <div>{index}</div>}
      <div>{children}</div>
      {pager && <div className="pt-2">{pager}</div>}
    </div>
  )
}
