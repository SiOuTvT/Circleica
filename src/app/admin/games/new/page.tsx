import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
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
    <div className="w-full">
      <h1 className="mb-6 text-xl font-bold text-foreground">新增游戏</h1>
      <GameForm tags={tags} tagGroups={tagGroups} />
    </div>
  )
}
