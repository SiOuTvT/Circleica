"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Download, Eye, Heart } from "lucide-react"
import { formatZhYearMonth } from "@/lib/date"
import { PersonLink } from "./person-link"
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
 * 游戏名（卡上标题文字）→ 英文名（有才渲染）→ 发行日期 + 制作组（12px 间距，无分隔符）
 * → 1px 分隔线 → 班底按角色分行 → 底部浏览/下载/收藏（0 不渲染）。
 *
 * 整卡一个目的地：卡内有一个真实的绝对定位整卡链接（铺满整卡、z-0），
 * 点卡内除人名外的任何位置都进「这部作品的参与者」名单页；封面与游戏名不再进游戏详情页。
 * 人名链接 z-10 高于整卡热区，点人名进创作者详情页。卡片根只挂 data-ripple 做点击反馈，
 * 不包成大 <a>（卡内已有小链接，嵌套 <a> 是非法 DOM）。
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
      className="group relative flex overflow-hidden rounded-2xl bg-card ring-1 ring-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:ring-foreground/10 hover:shadow-[0_3px_8px_rgba(0,0,0,0.08)] "
    >
      {/* 封面：竖版原图，宽 168px、高度跟随卡片拉伸（至少保 3:4），溢出隐藏。
          不再是链接（整卡一个目的地，进作品参与者名单页）。 */}
      <div className="relative w-[168px] min-h-[224px] shrink-0 self-stretch overflow-hidden bg-muted">
        <Cover src={data.coverImage} title={data.title} className="absolute inset-0" />
      </div>

      {/* 信息区 */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        {/* 1) 游戏名：退回成卡上的标题文字（整卡点击进名单页，不再进游戏详情） */}
        <span className="block min-w-0 truncate text-[18px] font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary">
          {data.title}
        </span>

        {/* 2) 英文名：非空才渲染 */}
        {data.englishName && (
          <p className="truncate text-[13px] text-muted-foreground">{data.englishName}</p>
        )}

        {/* 3) 日期 + 制作组：两项之间只用 12px 间距，不加任何分隔符 */}
        {hasMeta && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {dateLabel && <span className="tabular-nums">{dateLabel}</span>}
            {data.studioName && <span className="truncate">{data.studioName}</span>}
          </div>
        )}

        {/* 4) 分隔线：仅在有班底时渲染（无事可分隔时不留空线） */}
        {data.crew.length > 0 && <div className="h-px bg-border/60" />}

        {/* 5) 班底：按角色分行，人名之间 12px 间距、可换行、单个人名不拆行。
            人名链接 z-10，高于整卡热区，点人名进创作者详情页。 */}
        {data.crew.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {data.crew.map((row) => (
              <div key={row.role} className="flex items-start gap-3">
                <span className="w-12 shrink-0 text-xs leading-5 text-muted-foreground">{row.label}</span>
                <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
                  {row.members.map((m) =>
                    m.slug ? (
                      <PersonLink
                        key={m.id}
                        href={`/credits/creator/${encodeURIComponent(m.slug)}`}
                        className="relative z-10 whitespace-nowrap"
                      >
                        {m.displayName}
                      </PersonLink>
                    ) : (
                      <span key={m.id} className="relative z-10 whitespace-nowrap text-foreground/80">
                        {m.displayName}
                      </span>
                    ),
                  )}
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

      {/* 整卡热区：真实存在的绝对定位链接，铺满整卡、z 序高于普通内容、低于人名链接。
          置于末尾（z-0）确保压在封面与信息区之上；点卡内除人名外的任何位置都进
          「这部作品的参与者」名单页。 */}
      <Link
        href={`/credits/game/${data.serialId}`}
        aria-label={`《${data.title}》的参与者`}
        tabIndex={-1}
        className="absolute inset-0 z-0"
      />
    </div>
  )
}

/** 加载态骨架：形状对齐 WorkCrewCard（两列大卡），避免加载完成后布局跳动 */
export function WorkCrewCardSkeleton() {
  return (
    <div className="flex overflow-hidden rounded-2xl bg-card ring-1 ring-border">
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
