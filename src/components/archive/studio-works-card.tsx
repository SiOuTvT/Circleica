"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Eye, Heart } from "lucide-react"
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
 * 多组合并卡里每个组名各自可点进自己的详情页；单组卡组名退回成纯文字。
 * 右端「N 部作品」（1 也照实显示）。
 * 卡头下方按作品逐行：64px 竖版封面 + 游戏名（14px/500）+ 发行年份 + 非零的浏览/收藏小灰。
 * 行与行之间 1px 分隔线；行内不再有链接 / 箭头 / 行悬停。
 *
 * 点击热区：卡内有一个真实的绝对定位整卡链接（铺满整卡、z-0），点卡内除组名外的
 * 任何位置都进排前那一组（studios[0]）的详情页；组名链接 z-10 高于整卡热区，
 * 点哪个组名进哪个组的详情页。整卡不包成大 <a>（卡内已有小链接，嵌套 <a> 是非法的）。
 *
 * 高度：不强制等高，由外层网格 stretch 决定；卡内不加大留白去填高度。
 */
export function StudioWorksCard({ data }: { data: StudioWorksItem }) {
  return (
    <div
      data-ripple
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition duration-300 ease-in-out hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-lg"
    >
      {/* 卡头：每个组名独占一行；整块高度在窄屏也 ≥44px（不靠放大字号）。
          多组合并卡里每个组名各自可点进自己的详情页（z-10，高于整卡热区）；
          单组卡组名退回成纯文字，整卡点哪儿都进该组详情页。 */}
      <div className="flex min-h-[44px] items-start justify-between gap-3 px-4 pb-2 pt-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          {data.studios.map((s) =>
            data.studios.length > 1 ? (
              <Link
                key={s.slug}
                href={`/credits/studio/${encodeURIComponent(s.slug)}`}
                className="relative z-10 block min-w-0 truncate text-[16px] font-semibold text-foreground transition-colors duration-200 hover:text-primary hover:underline underline-offset-4 decoration-1 decoration-primary"
              >
                {s.name}
              </Link>
            ) : (
              <span
                key={s.slug}
                className="block min-w-0 truncate text-[16px] font-semibold text-foreground"
              >
                {s.name}
              </span>
            ),
          )}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {data.gameCount} 部作品
        </span>
      </div>

      {/* 作品行：整行纯展示，不再进游戏详情页（去掉行尾箭头与行内悬停）；
          点卡任意处统一进制作组详情页。 */}
      <div className="flex flex-col pb-1">
        {data.games.map((g, i) => {
          const year = yearOf(g.releaseDate)
          const viewStr = statStr(g.viewCount)
          const favStr = statStr(g.favoriteCount)
          return (
            <div key={g.id}>
              {i > 0 && <div className="h-px bg-border/60" />}
              <div className="flex items-center gap-3 px-4 py-1.5">
                <Thumb src={g.coverImage} title={g.title} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-foreground">{g.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
              </div>
            </div>
          )
        })}
      </div>

      {/* 整卡热区：真实存在的绝对定位链接，铺满整卡、z 序高于普通内容、低于组名链接。
          置于末尾（z-0）确保压在卡头/作品行之上；点卡内除组名外的任何位置都进
          排前那一组（studios[0]）的详情页。 */}
      <Link
        href={`/credits/studio/${encodeURIComponent(data.studios[0].slug)}`}
        aria-label={data.studios[0].name}
        tabIndex={-1}
        className="absolute inset-0 z-0"
      />
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
