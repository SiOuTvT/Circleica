import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import dynamic from "next/dynamic"

const TagGroupsManager = dynamic(() => import("@/components/tag-groups-manager").then(m => ({ default: m.TagGroupsManager })), {
  loading: () => <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>,
})

const TagsManager = dynamic(() => import("@/components/tags-manager").then(m => ({ default: m.TagsManager })), {
  loading: () => <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />)}</div>,
})

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
