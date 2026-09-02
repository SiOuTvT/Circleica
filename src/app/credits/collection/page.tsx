import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { getMainNsfwMode } from "@/lib/nsfw-mode"
import type { Metadata } from "next"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { HeaderSearch } from "@/components/archive/header-search"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"
import { computeDensity, computeArchiveState } from "@/components/archive/density"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "精选合集",
  description: "编辑挑选的同人游戏合集",
  openGraph: {
    title: "精选合集 · Circleica",
    description: "编辑挑选的同人游戏合集",
    images: ["/opengraph-image"],
  },
}

type CollectionSummary = Prisma.CuratedCollectionGetPayload<{
  include: {
    games: {
      take: 4
      orderBy: { sortOrder: "asc" }
      include: { game: { select: { id: true; serialId: true; title: true; coverImage: true } } }
    }
    _count: { select: { games: true } }
  }
}>

// 单张横版合集卡：左叠放封面区（固定 358 宽）+ 右文字区
function CollectionRow({ c }: { c: CollectionSummary }) {
  // 取前 4 部游戏封面（已按 NSFW 过滤），按「有图」的数量决定叠放张数
  const covers = c.games.slice(0, 4).map((g) => g.game.coverImage).filter(Boolean) as string[]

  return (
    <Link
      href={`/credits/collection/${c.slug}`}
      className="group flex flex-col gap-3 rounded-2xl bg-card px-4 py-4 ring-1 ring-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:ring-foreground/10 hover:shadow-[0_3px_8px_rgba(0,0,0,0.08)] hover:-translate-y-px sm:flex-row sm:items-center sm:gap-4"
    >
      {/* 封面区：宽度固定 358（160 + 66×3），不管实际 1/2/4 张都占这个宽度 */}
      <div className="relative h-[140px] w-[358px] max-w-full shrink-0 overflow-hidden">
        {covers.length === 0 ? (
          // 一张封面都没有：占位（首字）
          <div className="absolute left-0 top-0 flex h-[140px] w-[160px] items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-border">
            <span className="text-xl font-bold text-primary/30">{c.name.charAt(0)}</span>
          </div>
        ) : (
          // 叠放：第一张在最前，后面的向右后错（错位步长 66）；按倒序渲染使第一张置顶
          covers.slice(0, 4).map((cover, i, arr) => {
            const revIndex = arr.length - 1 - i // 倒序：原第 0 张最后渲染=最前
            return (
              <div
                key={i}
                className="absolute top-0 h-[140px] w-[160px] overflow-hidden rounded-lg bg-muted ring-1 ring-border transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                style={{ left: `${i * 66}px`, zIndex: 10 - i }}
              >
                <Image
                  src={cover}
                  alt={c.name}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="160px"
                />
              </div>
            )
          })
        )}
      </div>

      {/* 文字区：永远从同一位置开始 */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h3 className="truncate text-[17px] font-semibold text-foreground">{c.name}</h3>
        <p className="mt-2 text-[13px] tabular-nums text-muted-foreground">
          {c._count.games} 部精选
        </p>
      </div>
    </Link>
  )
}

export default async function CuratedCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim().toLowerCase()

  let all: CollectionSummary[] = []
  try {
    // ⚠️ 合集封面条（前 4 部游戏封面）按 NSFW 模式过滤：SFW 用户不看到露骨封面
    const nsfwMode = await getMainNsfwMode()
    const nsfwWhere = nsfwMode === "sfw" ? { isNsfw: false } : nsfwMode === "nsfw" ? { isNsfw: true } : {}
    all = await prisma.curatedCollection.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: {
        games: {
          where: { game: { isPublished: true, ...nsfwWhere } },
          orderBy: { sortOrder: "asc" },
          take: 4,
          include: { game: { select: { id: true, serialId: true, title: true, coverImage: true } } },
        },
        _count: { select: { games: true } },
      },
    })
  } catch {
    // 数据库不可用（构建期/沙箱）：返回空列表，绝不注入假数据
  }

  const collections = query
    ? all.filter((c) => c.name.toLowerCase().includes(query) || (c.description ?? "").toLowerCase().includes(query))
    : all

  const total = collections.length
  const density = computeDensity(total)
  const state = computeArchiveState(total)

  // 空态：保留页头与品牌语言，不渲染列表
  if (total === 0) {
    return (
      <ArchiveShell
        entity="collection"
        density={density}
        state="empty"
        // 页头必须走 header 槽（与下方常态分支一致）：作为 children 传入会落进不同的
        // 容器层级，space-y 间距计算随之改变，导致空态/非空态之间页头位置跳动。
        header={
          <ArchiveHero
            variant="series"
            eyebrow="collections"
            title="精选合集"
            lede="编辑挑选的同人游戏合集"
            meta={
              query ? (
                <span>
                  匹配 <span className="tabular-nums text-foreground">{total}</span> 个合集
                </span>
              ) : (
                <span>
                  共 <span className="tabular-nums text-foreground">{total}</span> 个合集
                </span>
              )
            }
            search={<HeaderSearch q={q} placeholder="搜索合集名称..." />}
          />
        }
      >
        <ArchivePlaceholder state="empty" entity="collection" message="暂无精选合集" />
      </ArchiveShell>
    )
  }

  return (
    <ArchiveShell
      entity="collection"
      density={density}
      state={state}
      header={
        <ArchiveHero
          variant="series"
          eyebrow="collections"
          title="精选合集"
          lede="编辑挑选的同人游戏合集"
          meta={
            <span>
              共 <span className="tabular-nums text-foreground">{total}</span> 个合集
            </span>
          }
          search={<HeaderSearch q={q} placeholder="搜索合集名称..." />}
        />
      }
    >
      {/* 整页统一一种横版小卡，一行 2 个 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {collections.map((c) => (
          <CollectionRow key={c.id} c={c} />
        ))}
      </div>
    </ArchiveShell>
  )
}
