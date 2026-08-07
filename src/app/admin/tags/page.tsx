import { requireAdmin } from "@/lib/admin"
import { ensurePresetTagGroups } from "@/lib/preset-tag-groups"
import { ensureResourceTags } from "@/lib/preset-resource-tags"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
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
  const { allTags, allGroups } = await cached(
    cacheKey("admin:tags:overview"),
    loadTagsOverview,
    60,
  )

  return (
    <AdminPageContainer
      eyebrow="TAGS"
      title="标签管理"
      description={`共 ${allTags.length} 个主站标签（source=circleica），涵盖全部已收录与历史标签`}
      actions={
        <Link
          href="/admin/tags/all"
          className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary ring-1 ring-primary/20 transition-all hover:bg-primary/20 cursor-pointer"
        >
          <List className="h-4 w-4" />
          分页全量视图
        </Link>
      }
    >
      <TagsOverviewClient tags={allTags} groups={allGroups} />
    </AdminPageContainer>
  )
}

async function loadTagsOverview() {
  // 主站标签统一管理：列出全部主站标签（不再按「已发布游戏」过滤，确保历史/未发布关联标签也可见），
  // 与副站标签管理（扁平行表格）保持一致，实现主副站后台界面与交互统一。
  const [tags, groups] = await Promise.all([
    prisma.tag.findMany({
      where: { source: "circleica" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        groupId: true,
        group: { select: { id: true, name: true, color: true } },
        _count: { select: { games: true } },
      },
    }),
    prisma.tagGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ])

  const allTags = tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    groupId: t.groupId,
    groupName: t.group?.name ?? null,
    groupColor: t.group?.color ?? null,
    gameCount: t._count.games,
  }))

  return {
    allTags,
    allGroups: groups,
  }
}