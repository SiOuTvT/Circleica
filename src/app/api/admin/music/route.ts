import { withHandler, json, created } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"

export const GET = withHandler(async () => {
  await requireAdminRole()
  const music = await prisma.music.findMany({
    orderBy: { createdAt: "desc" },
    include: { playlist: { select: { id: true, name: true } } },
  })
  return json(music)
})

export const POST = withHandler(async (req) => {
  await requireAdminRole()
  const body = await req.json()
  const title = body.title as string | undefined
  const url = body.url as string | undefined
  let playlistId = body.playlistId as string | undefined

  if (!title?.trim() || !url?.trim()) {
    throw new Error("标题和链接不能为空")
  }

  // Validate playlist exists if provided
  if (playlistId) {
    const pl = await prisma.playlist.findUnique({ where: { id: playlistId } })
    if (!pl) playlistId = undefined
  }

  const music = await prisma.music.create({
    data: { title: title.trim(), filename: url.trim(), url: url.trim(), playlistId: playlistId ?? null },
  })
  return created(music)
})
