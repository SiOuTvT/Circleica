import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { ValidationError } from "@/lib/errors"

export const POST = withHandler(async (req) => {
  await requireAdminRole()
  const body = await safeParseJson(req)
  const { vndbId, name } = body

  if (!vndbId || !name) {
    throw new ValidationError("缺少必要参数")
  }

  // Upsert: 存在就跳过，不存在就创建
  let creator = await prisma.creator.findFirst({ where: { vndbId: String(vndbId) } })
  if (!creator) {
    creator = await prisma.creator.create({
      data: {
        vndbId: String(vndbId),
        name: String(name),
        nameJa: body.nameJa || body.original || "",
        bio: body.description || body.bio || "",
        gender: body.gender || "",
        twitterUrl: body.twitterUrl || "",
        wikipediaUrl: body.wikipediaUrl || "",
      },
    })
  }

  return json({ ok: true, id: creator.id })
})
