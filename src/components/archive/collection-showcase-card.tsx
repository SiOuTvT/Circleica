"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"

export interface CollectionShowcaseData {
  id: string
  name: string
  gameCount: number
  /** 已按固定规则截断为 1 / 2 / 3 / 4 张（调用方负责） */
  covers: (string | null)[]
  description?: string | null
}

/** 封面瓦片尺寸与错位步长（px） */
const TILE_W = 120
const TILE_H = 168
const TILE_OFFSET = 44

/**
 * CollectionShowcaseCard — 精选合集展示卡（Collection Archive 网格专用）
 *
 * 设计目标：让用户一眼感到这是「精选合集」而非「含多游戏的普通列表项」。
 * - 横向长卡布局（桌面约 420×180）
 * - 左侧多张游戏封面横向错位叠放，形成集合层次感
 * - 封面数量固定规则：1→1 / 2→2 / 3→3 / 4+→前 4 张（不全部堆叠）
 * - 右侧展示合集名称 / 游戏数量 / 简短信息
 * 与 EntityCard（studio/creator）同源但不同：Collection 用专属展示卡，不套通用卡片视觉。
 */
export function CollectionShowcaseCard({
  id,
  slug,
  name,
  gameCount,
  covers,
  description,
}: CollectionShowcaseData & { slug?: string | null }) {
  const shown = covers.slice(0, 4)
  // slug 优先走新路由 /credits/collection/[slug]；缺失时回退旧 /collections/[id]（旧路由 308 再接）
  const href = slug
    ? `/credits/collection/${encodeURIComponent(slug)}`
    : `/collections/${id}`
  const tiles = shown.length > 0 ? shown : [null]
  const stackWidth = (tiles.length - 1) * TILE_OFFSET + TILE_W

  return (
    <Link
      href={href}
      className="group flex h-[180px] items-stretch overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-sm"
    >
      {/* 左：封面横向错位叠放，体现精选集合感 */}
      <div className="relative shrink-0" style={{ width: stackWidth }}>
        {tiles.map((cover, i) => (
          <CoverTile
            key={i}
            cover={cover}
            initial={name}
            index={i}
            total={tiles.length}
          />
        ))}
      </div>

      {/* 右：信息 */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-5 pl-4 pr-5">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary/70">
          精选合集
        </span>
        <h3 className="truncate font-heading text-base font-semibold text-foreground transition-colors group-hover:text-primary">
          {name}
        </h3>
        <p className="truncate text-xs text-muted-foreground/80">
          {description || "由编辑悉心挑选的精品合集"}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground/80">{gameCount}</span>
          <span>部精选</span>
        </div>
      </div>
    </Link>
  )
}

function CoverTile({
  cover,
  initial,
  index,
  total,
}: {
  cover: string | null
  initial: string
  index: number
  total: number
}) {
  const [errored, setErrored] = useState(false)
  // 第一张在最前（z 最高），后续向右错位叠放，露出集合层次（非完全重叠、非普通拼贴）
  const z = total - index
  const left = index * TILE_OFFSET
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-muted shadow-[0_4px_12px_rgba(0,0,0,0.35)] ring-2 ring-card"
      style={{ left, width: TILE_W, height: TILE_H, zIndex: z }}
    >
      {cover && !errored ? (
        <Image
          src={cover}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
          sizes="120px"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/12 to-primary/5">
          <span className="text-lg font-bold text-primary/30">{initial.slice(0, 1)}</span>
        </div>
      )}
    </div>
  )
}
