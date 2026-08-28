"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Download, Eye, Heart } from "lucide-react"
import { formatZhYearMonth } from "@/lib/date"
import type { WorkCrewItem } from "@/lib/credits-works"

/**
 * 数值格式化：空 / 0 一律返回空串 —— 调用方用真值判断决定是否渲染，
 * 保证「值为 0 的那一项不渲染」，且不留占位符。
 */
function statStr(n?: number | null): string {
  if (n == null || n <= 0) return ""
  if (n >= 10000) return (n / 10000).toFixed(1) + "w"
  if (n >= 1000) return (n / 1000).toFixed(1) + "k"
  return String(n)
}

function Cover({
  src,
  title,
  className,
}: {
  src: string | null
  title: string
  className?: string
}) {
  const [errored, setErrored] = useState(false)
  if (src && !errored) {
    return (
      <div className={className}>
        <Image
          src={src}
          alt=""
          fill
          className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          unoptimized
          sizes="168px"
          onError={() => setErrored(true)}
        />
      </div>
    )
  }
  // 回退底沿用站内既有方案（首字母 + 主色渐层），底色不改
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 ${className ?? ""}`}
    >
      <span className="text-3xl font-bold text-primary/30">{title.slice(0, 1)}</span>
    </div>
  )
}

/**
 * WorkCrewCard — 创作者图鉴「按作品」视图的作品卡（横向大卡）。
 *
 * 左封面（168px 竖版，高度跟随卡片拉伸）+ 右信息区：
 * 游戏名（链接）→ 英文名（有才渲染）→ 发行日期 + 制作组（12px 间距，无分隔符）
 * → 1px 分隔线 → 班底按角色分行 → 底部浏览/下载/收藏（0 不渲染）。
 *
 * ⚠️ 整卡不包成大链接：卡内已有游戏名、封面、制作组、人名等多个链接，
 * 嵌套 <a> 会产生非法 DOM。卡片根是普通 div（只挂 data-ripple 做点击反馈）。
 *
 * 空值策略：英文名 / 制作组 / 日期 / 各计数为空或 0 时整段不渲染，
 * 不留空位、不显示 0、不显示占位符。
 */
export function WorkCrewCard({ data }: { data: WorkCrewItem }) {
  const dateLabel = data.releaseDate ? formatZhYearMonth(data.releaseDate) : ""
  const hasMeta = Boolean(dateLabel || data.studioName)
  const viewStr = statStr(data.viewCount)
  const dlStr = statStr(data.downloadCount)
  const favStr = statStr(data.favoriteCount)
  const hasStats = Boolean(viewStr || dlStr || favStr)

  return (
    <div
      data-ripple
      className="group relative flex overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition duration-300 ease-in-out hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-lg"
    >
      {/* 封面：竖版原图，宽 168px、高度跟随卡片拉伸（至少保 3:4），溢出隐藏 */}
      <Link
        href={`/games/${data.serialId}`}
        data-ripple
        aria-label={data.title}
        className="relative w-[168px] min-h-[224px] shrink-0 self-stretch overflow-hidden bg-muted"
      >
        <Cover src={data.coverImage} title={data.title} className="absolute inset-0" />
      </Link>

      {/* 信息区 */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
        {/* 1) 游戏名：单行截断，进游戏详情 */}
        <Link
          href={`/games/${data.serialId}`}
          data-ripple
          className="truncate text-[18px] font-semibold leading-snug text-foreground transition-colors hover:text-primary"
        >
          {data.title}
        </Link>

        {/* 2) 英文名：非空才渲染 */}
        {data.englishName && (
          <p className="truncate text-[13px] text-muted-foreground">{data.englishName}</p>
        )}

        {/* 3) 日期 + 制作组：两项之间只用 12px 间距，不加任何分隔符 */}
        {hasMeta && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {dateLabel && <span className="tabular-nums">{dateLabel}</span>}
            {data.studioName && (
              <Link
                href={`/credits/studio/${encodeURIComponent(data.studioSlug ?? data.studioName)}`}
                data-ripple
                className="truncate transition-colors hover:text-primary hover:underline"
              >
                {data.studioName}
              </Link>
            )}
          </div>
        )}

        {/* 4) 分隔线：仅在有班底时渲染（无事可分隔时不留空线） */}
        {data.crew.length > 0 && <div className="h-px bg-border/60" />}

        {/* 5) 班底：按角色分行，人名之间 12px 间距、可换行、单个人名不拆行 */}
        {data.crew.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {data.crew.map((row) => (
              <div key={row.role} className="flex items-start gap-3">
                <span className="w-12 shrink-0 text-xs leading-5 text-muted-foreground">{row.label}</span>
                <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
                  {row.members.map((m) => (
                    <Link
                      key={m.id}
                      href={`/credits/creator/${encodeURIComponent(m.slug)}`}
                      data-ripple
                      className="whitespace-nowrap text-[13px] text-foreground/80 transition-colors hover:text-primary hover:underline"
                    >
                      {m.displayName}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 6) 底部数据行：沿用站内游戏卡的图标 + 数字，0 不渲染 */}
        {hasStats && (
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-3 text-xs text-muted-foreground">
            {viewStr && (
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {viewStr}
              </span>
            )}
            {dlStr && (
              <span className="flex items-center gap-1">
                <Download className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {dlStr}
              </span>
            )}
            {favStr && (
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                {favStr}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** 加载态骨架：形状对齐 WorkCrewCard（两列大卡），避免加载完成后布局跳动 */
export function WorkCrewCardSkeleton() {
  return (
    <div className="flex overflow-hidden rounded-2xl bg-card ring-1 ring-border/60">
      <div className="w-[168px] min-h-[224px] shrink-0 skeleton-shimmer" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="h-5 w-2/3 rounded skeleton-shimmer" />
        <div className="h-3.5 w-1/3 rounded skeleton-shimmer" />
        <div className="h-px bg-border/60" />
        <div className="h-4 w-1/2 rounded skeleton-shimmer" />
        <div className="h-4 w-2/5 rounded skeleton-shimmer" />
      </div>
    </div>
  )
}
