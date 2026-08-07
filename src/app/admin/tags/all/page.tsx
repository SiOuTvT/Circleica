import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { ensureResourceTags } from "@/lib/preset-resource-tags"
import { AllTagsClient, type GroupTab, type TagItem } from "./client"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminBackLink } from "@/components/admin/admin-back-link"

export const dynamic = "force-dynamic"

// 预设组 → 资源标签 SiteSetting key 的映射（与标签组详情页保持一致）
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

// 预设组 Tab 展示顺序（其余组按名称排序，未分组最后）
const PRESET_ORDER = ["preset_home_card", "preset_detail_header", "preset_discover", "preset_resource_tab"]

export default async function AllTagsPage() {
  await requireAdmin()

  const key = cacheKey("admin:tags:all")
  let tabs: GroupTab[] | null = null
  try {
    tabs = await cache.get<GroupTab[]>(key)
  } catch (e) {
    logger.db.error("[AdminTagsAll] Cache get failed", e)
  }

  if (!tabs) {
    const [groups, rawTags] = await Promise.all([
      prisma.tagGroup.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, color: true, description: true },
      }),
      prisma.tag.findMany({
        where: { source: "circleica" },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          color: true,
          isVisible: true,
          groupId: true,
          description: true,
          _count: { select: { games: true } },
        },
      }),
    ])

    // 按标签组归桶
    const groupMap = new Map<string, GroupTab>()
    for (const g of groups) {
      groupMap.set(g.id, { id: g.id, name: g.name, color: g.color, description: g.description, tags: [] })
    }
    const ungrouped: GroupTab = {
      id: "__ungrouped",
      name: "未分组",
      color: "#6b7280",
      description: "未归属任何标签组的标签",
      tags: [],
    }

    for (const t of rawTags) {
      const item: TagItem = {
        id: t.id,
        name: t.name,
        color: t.color,
        gameCount: t._count.games,
        isVisible: t.isVisible,
        description: t.description,
        groupId: t.groupId,
      }
      const bucket = t.groupId ? groupMap.get(t.groupId) : undefined
      if (bucket) bucket.tags.push(item)
      else ungrouped.tags.push(item)
    }

    // 首页卡片 / 资源标签组：并入设置驱动的资源伪标签（只读，不参与编辑删除）
    const resourceKeys = [...new Set(Object.values(GROUP_RESOURCE_KEY_MAP).flat())]
    await ensureResourceTags()
    const settings = await prisma.siteSetting.findMany({ where: { key: { in: resourceKeys } } })
    const settingMap = new Map(settings.map((s) => [s.key, s.value]))
    for (const [gid, keys] of Object.entries(GROUP_RESOURCE_KEY_MAP)) {
      const bucket = groupMap.get(gid)
      if (!bucket) continue
      for (const key of keys) {
        let options: string[] = []
        const raw = settingMap.get(key)
        if (raw) {
          try { options = JSON.parse(raw) } catch (err) { logger.db.warn("[AdminTagsAll] parse resource options failed", { error: err instanceof Error ? err.message : String(err) }) }
        }
        const label = RESOURCE_LABELS[key] ?? key
        for (const opt of options) {
          bucket.tags.push({
            id: `resource:${key}:${opt}`,
            name: opt,
            color: bucket.color,
            gameCount: 0,
            isVisible: true,
            description: label,
            groupId: gid,
          })
        }
      }
    }

    // 排序：预设组按固定顺序，其余按名称，未分组最后
    const ordered = Array.from(groupMap.values()).sort((a, b) => {
      const ai = PRESET_ORDER.indexOf(a.id)
      const bi = PRESET_ORDER.indexOf(b.id)
      const ra = ai === -1 ? 99 : ai
      const rb = bi === -1 ? 99 : bi
      if (ra !== rb) return ra - rb
      return a.name.localeCompare(b.name)
    })
    if (ungrouped.tags.length > 0) ordered.push(ungrouped)

    tabs = ordered
    try {
      await cache.set(key, tabs, 120)
    } catch (e) {
      logger.db.error("[AdminTagsAll] Cache set failed", e)
    }
  }

  const groups = await prisma.tagGroup.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  })
  const total = tabs.reduce((s, t) => s + t.tags.length, 0)

  return (
    <AdminPageContainer
      eyebrow="TAGS"
      title="全部标签"
      description={`共 ${total} 个标签，按标签组分栏展示`}
      actions={<AdminBackLink href="/admin/tags" label="返回" />}
    >
      <AllTagsClient tabs={tabs} groups={groups} total={total} />
    </AdminPageContainer>
  )
}
