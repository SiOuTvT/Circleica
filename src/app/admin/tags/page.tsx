import { TagGroupsManager } from "@/components/tag-groups-manager"
import { TagsManager } from "@/components/tags-manager"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "标签管理 · 管理后台" }

export default async function AdminTagsPage() {
  await requireAdmin()

  const [tags, groups] = await Promise.all([
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { games: true } }, group: true },
    }),
    prisma.tagGroup.findMany({
      orderBy: { name: "asc" },
      include: {
        tags: {
          orderBy: { name: "asc" },
          include: { _count: { select: { games: true } } },
        },
      },
    }),
  ])

  const initialTags = tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    gameCount: t._count.games,
    groupId: t.groupId,
    groupName: t.group?.name ?? null,
  }))

  const initialGroups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    color: g.color,
    tags: g.tags.map((t) => ({ id: t.id, name: t.name, color: t.color, gameCount: t._count.games })),
  }))

  return (
    <div className="w-full space-y-6">
      <h1 className="text-lg font-bold text-foreground">标签管理</h1>
      <TagGroupsManager initialGroups={initialGroups} />
      <TagsManager initialTags={initialTags} initialGroups={initialGroups} />
    </div>
  )
}
