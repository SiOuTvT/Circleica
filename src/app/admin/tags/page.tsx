import { requireAdmin } from "@/lib/admin"
import { ensurePresetTagGroups } from "@/lib/preset-tag-groups"
import { ensureResourceTags } from "@/lib/preset-resource-tags"
import { logger } from "@/lib/logger"
import { prisma, Prisma } from "@/lib/prisma"
import { TagsOverviewClient } from "./overview-client"
import { AdminPageContainer } from "@/components/admin-page-container"
import Link from "next/link"
import { List } from "lucide-react"
import { cache, cacheKey, cached } from "@/lib/redis"

export default async function TagsOverviewPage() {
  await requireAdmin()

  // 确保预设标签组和资源标签存在（并行，幂等，首次后近乎无成本）
  await Promise.all([ensurePresetTagGroups(), ensureResourceTags()])

  // 只读查询较重（全量标签 + 全表 GameTag 计数），缓存 60s 避免每次导航全打库
  const { mappedGroups } = await cached(
    cacheKey("admin:tags:overview"),
    loadTagsOverview,
    60,
  )

  return (
    <AdminPageContainer
      eyebrow="TAGS"
      title="标签管理"
      description="管理各页面的标签分组、颜色与归属"
      actions={
        <Link
          href="/admin/tags/all"
          className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary ring-1 ring-primary/20 transition-all hover:bg-primary/20 cursor-pointer"
        >
          <List className="h-4 w-4" />
          查看全部标签
        </Link>
      }
    >
      <TagsOverviewClient groups={mappedGroups} />
    </AdminPageContainer>
  )
}

async function loadTagsOverview() {
  // 获取标签计数、资源标签设置、标签组和未分组标签（全部并行）
  const [totalTagCount, allResourceSettings, groups] = await Promise.all([
    prisma.tag.count(),
    prisma.siteSetting.findMany({ where: { key: { in: ["resource_platforms", "resource_languages", "resource_run_types", "resource_content_types"] } } }),
    prisma.tagGroup.findMany({
      orderBy: [{ isPreset: "desc" }, { name: "asc" }],
      // 主站隔离：组内标签只保留「关联主站已发布游戏」的，杜绝串入副站(VNDB 摄入)数据
      include: {
        tags: {
          where: { games: { some: { game: { isPublished: true } } } },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, color: true },
        },
      },
    }),
  ])

  // 资源标签计数
  const homeCardTagKeys = ["resource_languages", "resource_run_types", "resource_content_types"]
  let totalResourceTagCount = 0
  let homeCardTagCount = 0
  for (const s of allResourceSettings) {
    try {
      const arr = JSON.parse(s.value)
      if (!Array.isArray(arr)) continue
      totalResourceTagCount += arr.length
      if (homeCardTagKeys.includes(s.key)) homeCardTagCount += arr.length
    } catch (err) { logger.db.warn("[TagsOverviewPage] parse resource tag setting failed", { error: err instanceof Error ? err.message : String(err) }) }
  }

  // 一次性获取所有标签的游戏计数
  const groupedTags = groups.flatMap(g => g.tags)
  const allTagIds = groupedTags.map(t => t.id)

  // 使用 Prisma 的参数化查询防止 SQL 注入
  const gameTagCounts = allTagIds.length > 0
    ? await prisma.$queryRaw<Array<{ tagId: string; _count: number }>>`
        SELECT "tagId", COUNT(*)::int as "_count"
        FROM "GameTag"
        WHERE "tagId" IN (${Prisma.join(allTagIds)})
        GROUP BY "tagId"
      `
    : []
  const countMap = new Map(gameTagCounts.map(r => [r.tagId, r._count]))

  const getGameCount = (tagId: string) => countMap.get(tagId) ?? 0

  const mappedGroups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    color: g.color,
    positions: Array.isArray(g.positions) ? g.positions : (typeof g.positions === "string" ? JSON.parse(g.positions || "[]") : []),
    isPreset: g.isPreset,
    // 根据预设组类型显示不同标签数
    tagCount: g.id === "preset_home_card"
      ? homeCardTagCount
      : g.id === "preset_resource_tab"
        ? totalResourceTagCount
        : g.isPreset ? totalTagCount : g.tags.length,
    totalGames: g.tags.reduce((s, t) => s + getGameCount(t.id), 0),
  }))

  return {
    mappedGroups,
  }
}