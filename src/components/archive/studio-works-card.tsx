"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronRight, Eye, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudioWorksItem } from "@/lib/credits-works"

/** 数值格式化：空 / 0 返回空串，由调用方真值判断决定是否渲染（0 不渲染） */
function statStr(n?: number | null): string {
  if (n == null || n <= 0) return ""
  if (n >= 10000) return (n / 10000).toFixed(1) + "w"
  if (n >= 1000) return (n / 1000).toFixed(1) + "k"
  return String(n)
}

/** 发行年份：无日期时不渲染 */
function yearOf(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return String(d.getUTCFullYear())
}

function Thumb({ src, title }: { src: string | null; title: string }) {
  const [errored, setErrored] = useState(false)
  if (src && !errored) {
    return (
      <div className="relative h-[85px] w-16 shrink-0 overflow-hidden rounded-md bg-muted">
        <Image
          src={src}
          alt=""
          fill
          className="object-cover"
          unoptimized
          sizes="64px"
          onError={() => setErrored(true)}
        />
      </div>
    )
  }
  // 回退底沿用站内既有方案（首字母 + 主色渐层），底色不改
  return (
    <div className="flex h-[85px] w-16 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary/10 to-primary/5">
      <span className="text-base font-bold text-primary/30">{title.slice(0, 1)}</span>
    </div>
  )
}

/**
 * StudioWorksCard — 制作组图鉴「按作品」视图的制作组卡。
 *
 * 卡头：作品集合相同的组已合并进同一张卡 —— 每个组名独占一行纵向排列，
 * 各自可点进自己的详情页；右端「N 部作品」（1 也照实显示）。
 * 卡头下方按作品逐行：64px 竖版封面 + 游戏名（14px/500）+ 发行年份 + 非零的浏览/收藏小灰。
 * 行与行之间 1px 分隔线；整行是一个链接，进游戏详情页。
 *
 * 点击热区：第一个组名的链接铺一层透明覆盖层（stretched-link），
 * 点卡头与卡内空白都进该组详情页；每条作品行抬到覆盖层之上（relative z-10），
 * 点行进那部游戏的详情页。整卡不包成大 <a>（卡内已有小链接，嵌套 <a> 是非法 DOM）。
 *
 * 高度：不强制等高，由外层网格 stretch 决定；卡内不加大留白去填高度。
 */
export function StudioWorksCard({ data }: { data: StudioWorksItem }) {
  return (
    <div
      data-ripple
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition duration-300 ease-in-out hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-lg"
    >
      {/* 卡头：每个组名独占一行；整块高度在窄屏也 ≥44px（不靠放大字号） */}
      <div className="flex min-h-[44px] items-start justify-between gap-3 px-4 pb-2 pt-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          {data.studios.map((s, i) => (
            <Link
              key={s.slug}
              href={`/credits/studio/${encodeURIComponent(s.slug)}`}
              // 此链接不挂 data-ripple：其 CSS 会 position:relative+overflow:hidden，
              // 会把下面铺满整卡的 ::after 覆盖层裁成标题大小。卡级 data-ripple 仍提供点击反馈。
              className={cn(
                "block min-w-0 text-[16px] font-semibold text-foreground transition-colors hover:text-primary hover:underline",
                // 首行铺透明覆盖层：整卡可点进该组详情页（链接自身不 relative/overflow，覆盖层才逃到卡片根）
                // 其余组名各自抬到覆盖层之上，点哪个进哪个组的详情页
                i === 0
                  ? "after:absolute after:inset-0 after:content-['']"
                  : "relative z-10",
              )}
            >
              <span className="block truncate">{s.name}</span>
            </Link>
          ))}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {data.gameCount} 部作品
        </span>
      </div>

      {/* 作品行：每条整行是一个链接，抬到覆盖层之上 */}
      <div className="flex flex-col pb-1">
        {data.games.map((g, i) => {
          const year = yearOf(g.releaseDate)
          const viewStr = statStr(g.viewCount)
          const favStr = statStr(g.favoriteCount)
          return (
            <div key={g.id}>
              {i > 0 && <div className="h-px bg-border/60" />}
              <Link
                href={`/games/${g.serialId}`}
                data-ripple
                className="group/row relative z-10 flex items-center gap-3 px-4 py-1.5 transition-colors hover:bg-muted/40"
              >
                <Thumb src={g.coverImage} title={g.title} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-foreground transition-colors group-hover/row:text-primary">
                    {g.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {year && <span className="tabular-nums">{year}</span>}
                    {viewStr && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        {viewStr}
                      </span>
                    )}
                    {favStr && (
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                        {favStr}
                      </span>
                    )}
                  </div>
                </div>
                {/* 行尾右箭头：提示整行可点（桌面/手机同款，沿用站内灰色档） */}
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 加载态骨架：形状对齐 StudioWorksCard（卡头 + 两行作品） */
export function StudioWorksCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
        <div className="h-5 w-1/2 rounded skeleton-shimmer" />
        <div className="h-3.5 w-16 rounded skeleton-shimmer" />
      </div>
      <div className="flex flex-col pb-1">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-1.5">
            <div className="h-[85px] w-16 shrink-0 rounded-md skeleton-shimmer" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded skeleton-shimmer" />
              <div className="h-3 w-1/4 rounded skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
