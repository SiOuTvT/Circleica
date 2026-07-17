import { requireAdmin } from "@/lib/admin"
import { ensureResourceTags } from "@/lib/preset-resource-tags"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { TagGroupDetailClient } from "./detail-client"

export const dynamic = "force-dynamic"

// 预设组 → 资源标签 SiteSetting key 的映射
const GROUP_RESOURCE_KEY_MAP: Record<string, string[]> = {
  preset_home_card: ["resource_languages", "resource_run_types", "resource_content_types"],
  preset_resource_tab: ["resource_platforms", "resource_languages", "resource_run_types", "resource_content_types"],
}

// SiteSetting key → 中文分组名
const RESOURCE_LABELS: Record<string, string> = {
  resource_platforms: "运行平台",
  resource_languages: "游戏语言",
  resource_run_types: "运行方式",
  resource_content_types: "资源内容",
}

export default async function TagGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  // 查询标签组及其标签
  const group = await prisma.tagGroup.findUnique({
    where: { id },
    include: {
      tags: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          color: true,
          description: true,
          groupId: true,
          sortOrder: true,
          isVisible: true,
          _count: { select: { games: true } },
        },
      },
    },
  })

  if (!group) notFound()

  // 查询所有标签组（用于标签编辑时选择归属组）
  const allGroups = await prisma.tagGroup.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  })

  // 对于预设组，从 SiteSetting 获取资源标签
  let tags: Array<{
    id: string
    name: string
    color: string
    gameCount: number
    description?: string | null
    groupId?: string | null
    sortOrder?: number
    isVisible?: boolean
  }> = []

  const resourceKeys = group.isPreset ? (GROUP_RESOURCE_KEY_MAP[id] ?? []) : []

  if (resourceKeys.length > 0) {
    // 有资源标签映射的预设组（首页卡片、资源标签）
    await ensureResourceTags()
    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: resourceKeys } },
    })
    const map = new Map(settings.map((s) => [s.key, s.value]))

    for (const key of resourceKeys) {
      const raw = map.get(key)
      let options: string[] = []
      if (raw) {
        try { options = JSON.parse(raw) } catch (err) { logger.db.warn("[TagGroupDetailPage] parse resource options failed", { error: err instanceof Error ? err.message : String(err) }) }
      }
      const label = RESOURCE_LABELS[key] ?? key
      for (const opt of options) {
        tags.push({
          id: `resource:${key}:${opt}`,
          name: opt,
          color: group.color,
          gameCount: 0,
          description: label,
          groupId: group.id,
          sortOrder: 0,
          isVisible: true,
        })
      }
    }
  } else if (group.isPreset && group.tags.length === 0) {
    // 没有标签的预设组（如发现页标签组）→ 显示所有游戏标签
    const allTags = await prisma.tag.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        description: true,
        groupId: true,
        sortOrder: true,
        isVisible: true,
        _count: { select: { games: true } },
      },
    })
    tags = allTags.map((t) => ({
      id: t.id,
      name: t.name,
      color: group.color, // 预设组统一用组的颜色
      gameCount: t._count.games,
      description: t.description,
      groupId: t.groupId,
      sortOrder: t.sortOrder,
      isVisible: t.isVisible,
    }))
  } else {
    // 普通标签组或有标签的预设组
    tags = group.tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: group.isPreset ? group.color : t.color, // 预设组用组的颜色，普通组用标签自己的颜色
      gameCount: t._count.games,
      description: t.description,
      groupId: t.groupId,
      sortOrder: t.sortOrder,
      isVisible: t.isVisible,
    }))
  }

  return (
    <TagGroupDetailClient
      group={{
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color,
        positions: Array.isArray(group.positions) ? group.positions as string[] : [],
        isPreset: group.isPreset,
      }}
      tags={tags}
      allGroups={allGroups}
    />
  )
}
