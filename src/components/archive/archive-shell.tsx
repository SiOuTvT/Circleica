import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ArchiveDensity } from "./density"

interface ArchiveShellProps {
  /** Archive 浏览体系实体（仅 studio / creator / collection，不含 Game Detail） */
  entity: "studio" | "creator" | "collection"
  /** 密度三态：JS 层经 DENSITY_GRID 驱动网格列数；data-density 属性供 CSS / QA 钩子 */
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
 * 注入 data-archive-entity / data-density，供子组件与 CSS / QA 钩子读取。
 * 密度经 DENSITY_GRID（density.ts）在 JS 层驱动网格列数。
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
  return (
    <div data-archive-entity={entity} data-density={density} className={cn("space-y-6", className)}>
      {breadcrumb && <div className="text-sm">{breadcrumb}</div>}
      {header && <div>{header}</div>}
      {toolbar && <div>{toolbar}</div>}
      {index && <div>{index}</div>}
      <div>{children}</div>
      {pager && <div className="pt-2">{pager}</div>}
    </div>
  )
}
