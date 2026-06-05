import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { TagGroupDetailClient } from "./detail-client"

export const dynamic = "force-dynamic"

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

  const tags = group.tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    gameCount: t._count.games,
    description: t.description,
    groupId: t.groupId,
    sortOrder: t.sortOrder,
    isVisible: t.isVisible,
  }))

  return (
    <TagGroupDetailClient
      group={{
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color,
        positions: (() => { try { return JSON.parse(group.positions) } catch { return group.positions ? group.positions.split(",").map((p: string) => p.trim()).filter(Boolean) : [] } })(),
        isPreset: group.isPreset,
      }}
      tags={tags}
      allGroups={allGroups}
    />
  )
}