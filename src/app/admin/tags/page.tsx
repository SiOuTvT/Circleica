import { requireAdmin } from "@/lib/admin"
import { ensurePresetTagGroups } from "@/lib/preset-tag-groups"
import { ensureResourceTags } from "@/lib/preset-resource-tags"
import { prisma } from "@/lib/prisma"
import { TagsOverviewClient } from "./overview-client"

export const dynamic = "force-dynamic"

export default async function TagsOverviewPage() {
  await requireAdmin()

  // 确保预设标签组存在
  await ensurePresetTagGroups()
  // 确保资源标签数据存在
  await ensureResourceTags()

  // 获取标签总数（用于预设组显示）
  const totalTagCount = await prisma.tag.count()

  // 获取资源标签计数
  const allResourceTagKeys = ["resource_platforms", "resource_languages", "resource_run_types", "resource_content_types"]
  const homeCardTagKeys = ["resource_languages", "resource_run_types", "resource_content_types"]
  const allResourceSettings = await prisma.siteSetting.findMany({
    where: { key: { in: allResourceTagKeys } },
  })
  let totalResourceTagCount = 0
  let homeCardTagCount = 0
  for (const s of allResourceSettings) {
    try {
      const arr = JSON.parse(s.value)
      if (!Array.isArray(arr)) continue
      totalResourceTagCount += arr.length
      if (homeCardTagKeys.includes(s.key)) homeCardTagCount += arr.length
    } catch {}
  }

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
    // 根据预设组类型显示不同标签数
    tagCount: g.id === "preset_home_card"
      ? homeCardTagCount
      : g.id === "preset_resource_tab"
        ? totalResourceTagCount
        : g.isPreset ? totalTagCount : g.tags.length,
    totalGames: g.tags.reduce((s, t) => s + t._count.games, 0),
  }))

  const ungroupedTags = await prisma.tag.findMany({
    where: { groupId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      color: true,
      description: true,
      sortOrder: true,
      isVisible: true,
      _count: { select: { games: true } },
    },
  })

  const mappedUngrouped = ungroupedTags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    gameCount: t._count.games,
    description: t.description,
    sortOrder: t.sortOrder,
    isVisible: t.isVisible,
  }))

  return (
    <TagsOverviewClient groups={mappedGroups} ungroupedTags={mappedUngrouped} allGroups={mappedGroups.map(g => ({ id: g.id, name: g.name, color: g.color }))} />
  )
}