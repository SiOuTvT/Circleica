import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { ensureResourceTags } from "@/lib/preset-resource-tags"
import { AllTagsClient, type GroupTab, type TagItem } from "./client"
import { AdminPageContainer } from "@/components/admin-page-container"

export const metadata = { title: "全部标签" }

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

// 预设组 Tab 展示顺序（其余组按名称排序）
const PRESET_ORDER = ["preset_home_card", "preset_detail_header", "preset_discover", "preset_resource_tab"]

interface RawTag {
  id: string
  name: string
  color: string
  isVisible: boolean
  groupId: string | null
  description: string | null
  _count: { games: number }
}

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
    const [groups, rawTags, publishedTags, resources] = await Promise.all([
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
      // 详情页标签 / 发现页标签：同源「已发布游戏关联的标签」，仅前台位置/颜色不同
      prisma.tag.findMany({
        where: { source: "circleica", games: { some: { game: { isPublished: true } } } },
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
      // 资源标签「关联作品数」：统计每个资源选项被多少「已发布游戏」的资源引用（去重到游戏）
      prisma.gameResource.findMany({
        where: { game: { isPublished: true } },
        select: { gameId: true, platform: true, language: true, runType: true, resourceContent: true },
      }),
    ])

    // 资源选项(SiteSetting key) → GameResource 字段 映射
    const KEY_FIELD: Record<string, "platform" | "language" | "runType" | "resourceContent"> = {
      resource_platforms: "platform",
      resource_languages: "language",
      resource_run_types: "runType",
      resource_content_types: "resourceContent",
    }
    // 各字段下：选项名 → 关联（已发布）游戏去重集合
    const resourceGameSets: Record<string, Map<string, Set<string>>> = {}
    for (const r of resources) {
      for (const field of Object.values(KEY_FIELD)) {
        const vals = (r[field] as unknown[] | null) ?? []
        const m = (resourceGameSets[field] ??= new Map<string, Set<string>>())
        for (const v of vals) {
          const name = String(v)
          let set = m.get(name)
          if (!set) { set = new Set<string>(); m.set(name, set) }
          set.add(r.gameId)
        }
      }
    }
    const resourceCounts: Record<string, Map<string, number>> = {}
    for (const [field, m] of Object.entries(resourceGameSets)) {
      resourceCounts[field] = new Map([...m.entries()].map(([k, s]) => [k, s.size]))
    }

    const toItem = (t: RawTag): TagItem => ({
      id: t.id,
      name: t.name,
      color: t.color,
      gameCount: t._count.games,
      isVisible: t.isVisible,
      description: t.description,
      groupId: t.groupId,
    })

    // 按标签组归桶（详情页/发现页由下方 publishedTags 填充，这里跳过，避免重复）
    const groupMap = new Map<string, GroupTab>()
    for (const g of groups) {
      groupMap.set(g.id, { id: g.id, name: g.name, color: g.color, description: g.description, tags: [] })
    }

    for (const t of rawTags) {
      if (t.groupId === "preset_detail_header" || t.groupId === "preset_discover") continue
      const bucket = t.groupId ? groupMap.get(t.groupId) : undefined
      if (bucket) bucket.tags.push(toItem(t))
      else groupMap.get("preset_detail_header")?.tags.push(toItem(t))
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
            gameCount: resourceCounts[KEY_FIELD[key]]?.get(opt) ?? 0,
            isVisible: true,
            description: label,
            groupId: gid,
          })
        }
      }
    }

    // 详情页标签 / 发现页标签：用「已发布游戏关联的标签」填充（同源，仅前台位置/颜色不同）
    const detailBucket = groupMap.get("preset_detail_header")
    const discoverBucket = groupMap.get("preset_discover")
    for (const t of publishedTags) {
      const item = toItem(t)
      if (detailBucket) detailBucket.tags.push(item)
      if (discoverBucket) discoverBucket.tags.push({ ...item, color: discoverBucket.color })
    }

    // 排序：预设组按固定顺序，其余按名称
    const ordered = Array.from(groupMap.values()).sort((a, b) => {
      const ai = PRESET_ORDER.indexOf(a.id)
      const bi = PRESET_ORDER.indexOf(b.id)
      const ra = ai === -1 ? 99 : ai
      const rb = bi === -1 ? 99 : bi
      if (ra !== rb) return ra - rb
      return a.name.localeCompare(b.name)
    })

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
  // 去重计数（详情页/发现页同源，避免重复计入）
  const seen = new Set<string>()
  for (const t of tabs) for (const tag of t.tags) seen.add(tag.id)
  const total = seen.size

  return (
    <AdminPageContainer
      eyebrow="TAGS"
      title="全部标签"
      description={`共 ${total} 个标签，按标签组分栏展示`}
    >
      <AllTagsClient tabs={tabs} groups={groups} total={total} />
    </AdminPageContainer>
  )
}
