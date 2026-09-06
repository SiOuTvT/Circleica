import type { ReactNode } from "react"
import Link from "next/link"
import { Layers, Users, User, Tag as TagIcon, Compass, Trophy, Gamepad2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { HeroCover } from "./hero-cover"

export type ArchiveHeroVariant = "org" | "person" | "series" | "detail" | "tag" | "discover" | "ranking" | "games"

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
  /**
   * 可选入口：传入后整块页头（封面 + 标题）合并为一个真实链接，跳转到该作品详情页。
   * 仅作品参与者名单页使用；其余图鉴页不传，保持无跳转。
   */
  href?: string
  /**
   * 详情页规格（opt-in，仅主站制作组 / 创作者详情页开启；默认 false 不改变其它页面）：
   *  - 无封面时仍走详情页版式（不退化成浏览页小标题）；
   *  - 头像 / 方块统一到 128×128（与制作组详情页现有规格一致）。
   */
  detailSpec?: boolean
}

const ICON_MAP: Record<ArchiveHeroVariant, typeof Layers> = {
  series: Layers,
  org: Users,
  person: User,
  tag: TagIcon,
  detail: Layers,
  discover: Compass,
  ranking: Trophy,
  games: Gamepad2,
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
  href,
  detailSpec = false,
}: ArchiveHeroProps) {
  const shape: "rect" | "circle" = variant === "person" ? "circle" : "rect"
  const isTag = variant === "tag"
  const initial = isTag ? "#" : fallbackInitial || title
  const Icon = ICON_MAP[variant] ?? Layers

  // 详情页：实体真封面（由 client 子组件 HeroCover 渲染，保留 onError 兜底）
  if (cover || detailSpec) {
    const wrapperCls = cn(
      "flex flex-col gap-5",
      variant === "person" && "sm:flex-row sm:items-center",
      href && "group",
      className,
    )
    const inner = (
      <>
        <HeroCover
          cover={cover}
          initial={initial}
          shape={shape}
          alt={title}
          size={detailSpec ? "detail" : "default"}
        />
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              "break-words font-heading text-2xl font-bold text-foreground sm:text-3xl transition-colors duration-200 underline-offset-4 decoration-1",
              href && "group-hover:text-primary",
            )}
          >
            {title}
          </h1>
          {lede && <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{lede}</p>}
          {meta && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {meta}
            </div>
          )}
        </div>
      </>
    )
    if (href) {
      return (
        <Link href={href} className={wrapperCls}>
          {inner}
        </Link>
      )
    }
    return <header className={wrapperCls}>{inner}</header>
  }

  // 浏览页：放大图标 + 两层文字 + 搜索（统一视觉基因，纯 Server 渲染）
  // 页头图标固定用 text-primary，不按标签色上色（全站 90 个标签里 89 个色值相同，无区分作用，且与其余页面的主题色页头不一致）
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start gap-4">
        {/* 图标为纯矢量、无容器装饰 */}
        <div className={cn("flex h-12 w-fit shrink-0 items-center justify-center", "text-primary")}>
          <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2} aria-hidden />
        </div>
        {/* 文字列：eyebrow + title + lede + meta 共用图标右侧这一条左基准线，
            左边缘一致；flex-1 让文字列吃掉剩余宽度，lede/meta 不再掉到 header 最左 */}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
          )}
          <h1 className="break-words font-heading text-xl font-bold leading-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {lede && (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{lede}</p>
          )}
          {meta && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">{meta}</div>
          )}
        </div>
      </div>
      {/* search 是控件区（搜索/筛选），不属于标题文字，保持为 header 直接子节点、全宽 */}
      {search && <div className="mt-1">{search}</div>}
    </header>
  )
}
