import { withHandler, json, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"

export const PUT = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if ("isActive" in body) data.isActive = body.isActive
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim()
  if (typeof body.url === "string" && body.url.trim()) data.url = body.url.trim()

  if (Object.keys(data).length === 0) {
    throw new Error("没有要更新的字段")
  }

  const m = await prisma.music.update({ where: { id }, data })
  return json(m)
})

export const DELETE = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  await prisma.music.delete({ where: { id } })
  return noContent()
})
