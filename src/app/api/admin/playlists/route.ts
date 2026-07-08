import { withHandler, json, created } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"

export const GET = withHandler(async () => {
  await requireAdminRole()
  const playlists = await prisma.playlist.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { music: true } } },
  })
  return json(playlists)
})

export const POST = withHandler(async (req) => {
  await requireAdminRole()
  const { name } = await req.json()
  if (!name?.trim()) {
    throw new Error("名称不能为空")
  }
  const pl = await prisma.playlist.create({ data: { name: name.trim() } })
  return created(pl)
})
