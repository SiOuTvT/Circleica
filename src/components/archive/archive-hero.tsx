import type { ReactNode } from "react"
import { Layers, Users, User, Tag as TagIcon, Compass, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { HeroCover } from "./hero-cover"

export type ArchiveHeroVariant = "org" | "person" | "series" | "detail" | "tag" | "discover" | "ranking"

interface ArchiveHeroProps {
  variant: ArchiveHeroVariant
  title: string
  eyebrow?: string
  lede?: ReactNode
  meta?: ReactNode
  cover?: string | null
  fallbackInitial?: string
  /** 浏览页：介绍文案下方的搜索框 / 筛选区（与精选合集功能对齐） */
  search?: ReactNode
  className?: string
}

const ICON_MAP: Record<ArchiveHeroVariant, typeof Layers> = {
  series: Layers,
  org: Users,
  person: User,
  tag: TagIcon,
  detail: Layers,
  discover: Compass,
  ranking: Trophy,
}

/**
 * ArchiveHero — 全站唯一页头（以「精选合集」为终极标杆，四页像素级克隆）。
 *
 * ⚠️ 本组件为 **Server Component**：浏览页分支（不传 cover）纯服务端渲染，
 * 彻底脱离 client JS chunk，消除「浏览器缓存旧 chunk 导致四页标题尺寸不一致」的缓存分叉。
 * 详情页（传 cover）由 HeroCover（独立 client 子组件）渲染实体真封面。
 *
 * 浏览页（不传 cover）：
 *  - 左：主题色矢量图标（text-primary，无灰底框），高度与右侧「英文副标题 + 主标题」两行文字对齐
 *  - 右两层：英文副标题（顶部）→ 衬线主标题（text-xl sm:text-2xl，**小于**详情页的 text-2xl sm:text-3xl）
 *  - 搜索框 / 筛选区紧随介绍文案下方
 */
export function ArchiveHero({
  variant,
  title,
  eyebrow,
  lede,
  meta,
  cover,
  fallbackInitial,
  search,
  className,
}: ArchiveHeroProps) {
  const shape: "rect" | "circle" = variant === "person" ? "circle" : "rect"
  const isTag = variant === "tag"
  const initial = isTag ? "#" : fallbackInitial || title
  const Icon = ICON_MAP[variant] ?? Layers

  // 详情页：实体真封面（由 client 子组件 HeroCover 渲染，保留 onError 兜底）
  if (cover) {
    return (
      <header
        className={cn(
          "flex flex-col gap-5",
          variant === "person" && "sm:flex-row sm:items-center",
          className,
        )}
      >
        <HeroCover cover={cover} initial={initial} shape={shape} />
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              {eyebrow}
            </p>
          )}
          <h1 className="break-words font-heading text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
          {lede && <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{lede}</p>}
          {meta && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {meta}
            </div>
          )}
        </div>
      </header>
    )
  }

  // 浏览页：放大图标 + 两层文字 + 搜索（统一视觉基因，纯 Server 渲染）
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-4">
        {/* 图标为纯矢量、无容器装饰：早期的 rounded-none / bg-transparent / shadow-none / ring-0
            与 sm:h-12（同值重复）均为去掉灰底框后残留的空声明，已清理 */}
        <div className="flex h-12 w-fit shrink-0 items-center justify-center text-primary">
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">{eyebrow}</p>
          )}
          <h1 className="break-words font-heading text-xl font-bold leading-tight text-foreground sm:text-2xl">
            {title}
          </h1>
        </div>
      </div>
      {lede && (
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{lede}</p>
      )}
      {search && <div className="mt-1">{search}</div>}
      {meta && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">{meta}</div>
      )}
    </header>
  )
}
