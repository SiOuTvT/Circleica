import { TagsManager } from "@/components/tags-manager"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "标签管理 · 管理后台" }

export default async function AdminTagsPage() {
  await requireAdmin()
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { games: true } } },
  })
  const initialTags = tags.map((t) => ({ id: t.id, name: t.name, color: t.color, gameCount: t._count.games }))

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-bold text-foreground">标签管理</h1>
      <TagsManager initialTags={initialTags} />
    </div>
  )
}
