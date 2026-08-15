import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/slug"
import { ValidationError } from "@/lib/errors"

export const POST = withHandler(async (req) => {
  await requireAdminRole()
  const body = await safeParseJson(req)
  const { vndbId, name } = body

  if (!vndbId || !name) {
    throw new ValidationError("缺少必要参数")
  }

  // Upsert: 优先 vndbId，其次 (name, source=circleica)；存在就返回，避免重复 Creator
  let creator =
    (await prisma.creator.findFirst({ where: { vndbId: String(vndbId) } })) ??
    (await prisma.creator.findFirst({ where: { name: String(name), source: "circleica" } }))
  if (!creator) {
    // slug 唯一兜底（同名碰撞时追加序号）
    const baseName = String(name)
    let slug = slugify(baseName)
    let n = 2
    while (await prisma.creator.findUnique({ where: { slug } })) {
      slug = `${slugify(baseName)}-${n++}`
    }
    try {
      creator = await prisma.creator.create({
        data: {
          vndbId: String(vndbId),
          name: baseName,
          slug,
          nameJa: body.nameJa || body.original || "",
          bio: body.description || body.bio || "",
          gender: body.gender || "",
          twitterUrl: body.twitterUrl || "",
          wikipediaUrl: body.wikipediaUrl || "",
        },
      })
    } catch (e) {
      // 并发创建触发唯一约束时，改返回既有记录（P2002 兜底）
      if ((e as { code?: string })?.code === "P2002") {
        creator =
          (await prisma.creator.findFirst({ where: { vndbId: String(vndbId) } })) ??
          (await prisma.creator.findFirst({ where: { name: baseName, source: "circleica" } }))
      }
      if (!creator) throw e
    }
  }

  return json({ ok: true, id: creator.id })
})
