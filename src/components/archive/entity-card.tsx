import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface StudioCardData {
  name: string
  normalized: string
  gameCount: number
  coverImage: string | null
  creatorCount: number
}
export interface CreatorCardData {
  id: string
  name: string
  nameJa?: string | null
  avatar?: string | null
  roles: string[]
}
export interface CollectionCardData {
  name: string
  slug: string
  gameCount: number
  coverImage?: string | null
}

const ROLE_LABELS: Record<string, string> = {
  scenario: "脚本",
  art: "原画",
  chardesign: "角色设计",
  music: "音乐",
  songs: "主题曲",
  director: "导演",
  other: "其他",
}

function CardShell({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-sm",
        className,
      )}
    >
      {children}
    </Link>
  )
}

function CoverMedia({
  cover,
  initial,
}: {
  cover: string | null | undefined
  initial: string
}) {
  if (cover) {
    return (
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <Image
          src={cover}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
          sizes="280px"
        />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/55 to-transparent" />
      </div>
    )
  }
  return (
    <div className="relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
      <span className="text-2xl font-bold text-primary/30">{initial.slice(0, 1)}</span>
    </div>
  )
}

/**
 * EntityCard — 卡片外壳（Framework，Archive 浏览体系共用）
 * 三变体外壳：studio / creator / collection。
 * M1 仅 studio 被实际落地页面使用；creator / collection 仅为组件契约外壳，
 * 其独立页面在后续阶段开发，此处不预埋半成品页面逻辑。
 */
export function EntityCard(
  props:
    | { variant: "studio"; data: StudioCardData }
    | { variant: "creator"; data: CreatorCardData }
    | { variant: "collection"; data: CollectionCardData },
) {
  if (props.variant === "studio") {
    const { data } = props
    return (
      <CardShell href={`/credits/studio/${encodeURIComponent(data.normalized)}`}>
        <CoverMedia cover={data.coverImage} initial={data.name} />
        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <h3 className="truncate font-heading text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {data.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums text-foreground/80">{data.gameCount}</span>
            <span>部作品</span>
            {data.creatorCount > 0 && (
              <>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/20" />
                <span className="tabular-nums text-foreground/80">{data.creatorCount}</span>
                <span>位创作者</span>
              </>
            )}
          </div>
        </div>
      </CardShell>
    )
  }

  if (props.variant === "creator") {
    const { data } = props
    const display = data.nameJa || data.name
    return (
      <CardShell href={`/creators/${data.id}`} className="flex-row items-center p-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/50">
          {data.avatar ? (
            <Image
              src={data.avatar}
              alt={display}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
              sizes="48px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
              <span className="text-sm font-bold text-primary/40">{display.slice(0, 1)}</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-medium text-foreground transition-colors group-hover:text-primary">
            {display}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {data.roles.slice(0, 2).map((r) => (
              <span key={r} className="rounded-md bg-primary-soft px-1.5 py-0 text-[10px] leading-4 text-primary">
                {ROLE_LABELS[r] || r}
              </span>
            ))}
            <span className="text-xs text-muted-foreground">· 创作者</span>
          </div>
        </div>
      </CardShell>
    )
  }

  // collection — 契约外壳，页面后续阶段实现
  const { data } = props
  return (
    <CardShell href={`/collections/${data.slug}`}>
      <CoverMedia cover={data.coverImage ?? null} initial={data.name} />
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="truncate font-heading text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
          {data.name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums text-foreground/80">{data.gameCount}</span>
          <span>部作品</span>
        </div>
      </div>
    </CardShell>
  )
}
