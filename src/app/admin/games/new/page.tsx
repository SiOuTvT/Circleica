import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import dynamic from "next/dynamic"

const GameForm = dynamic(() => import("@/components/game-form").then(m => ({ default: m.GameForm })), {
  loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" />,
})

export const metadata = { title: "新增游戏 · 管理后台" }

export default async function NewGamePage() {
  await requireAdmin()
  const [tags, tagGroups] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.tagGroup.findMany({
      orderBy: { name: "asc" },
      include: { tags: { orderBy: { name: "asc" } } },
    }),
  ])
  return (
    <div className="w-full space-y-6">
      <AdminPageHeader eyebrow="NEW GAME" title="新增游戏" />
      <GameForm tags={tags} tagGroups={tagGroups} />
    </div>
  )
}
