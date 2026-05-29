import { prisma } from "@/lib/prisma"
import { TagsOverviewClient } from "./overview-client"

export const dynamic = "force-dynamic"

export default async function TagsOverviewPage() {
  // 查询所有标签组及其标签数量统计
  const groups = await prisma.tagGroup.findMany({
    orderBy: [{ isPreset: "desc" }, { name: "asc" }],
    include: {
      tags: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          color: true,
          _count: { select: { games: true } },
        },
      },
    },
  })

  const mappedGroups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    color: g.color,
    positions: Array.isArray(g.positions) ? g.positions : (typeof g.positions === "string" ? JSON.parse(g.positions || "[]") : []),
    isPreset: g.isPreset,
    tagCount: g.tags.length,
    totalGames: g.tags.reduce((s, t) => s + t._count.games, 0),
  }))

  return (
    <TagsOverviewClient groups={mappedGroups} />
  )
}