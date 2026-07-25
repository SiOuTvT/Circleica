import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { AppError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { ensurePresetTagGroups } from "@/lib/preset-tag-groups"
import { prisma } from "@/lib/prisma"
import { vndbAdapter } from "@/lib/galvelica/sources"

export const POST = withHandler(async (req) => {
  await requireAdminRole()

  // 确保预设标签组存在（VNDB 导入会引用 preset_detail_header）
  await ensurePresetTagGroups()

  const { vndbId } = await safeParseJson(req)
  if (!vndbId?.trim()) {
    throw new AppError("请输入 VNDB 编号", "VALIDATION_ERROR", 422)
  }

  // 通过 Galvelica 源适配器拉取并归一化（传输层复用 VNDBClient：代理 / IPv4 / 重试 / 缓存）
  const payload = await vndbAdapter.fetchByExternalId(vndbId.trim())
  if (!payload) {
    throw new AppError("未找到对应的 VNDB 游戏", "NOT_FOUND", 404)
  }

  const norm = vndbAdapter.normalize(payload)
  if (!norm.title) {
    throw new AppError("未找到对应的 VNDB 游戏", "NOT_FOUND", 404)
  }

  // 标签：查询已有 / 自动创建缺失（默认分配到"详情页信息栏标签"组）
  const tagNames = (norm.tags ?? []).map((t) => t.name)
  const existingTags = await prisma.tag.findMany({
    where: { name: { in: tagNames } },
    select: { id: true, name: true },
  })
  const existingNameSet = new Set(existingTags.map((t) => t.name))

  const newTagNames = tagNames.filter((n) => !existingNameSet.has(n))
  const newTags = (
    await Promise.all(
      newTagNames.map((name) =>
        prisma.tag
          .create({
            data: { name, color: "#6b7280", groupId: "preset_detail_header" },
            select: { id: true, name: true },
          })
          .catch((err) => {
            logger.db.warn("[VndbRoute] create tag failed (possible duplicate)", {
              error: err instanceof Error ? err.message : String(err),
            })
            return null
          }),
      ),
    )
  ).filter(Boolean) as { id: string; name: string }[]

  const allTagIds = [...existingTags, ...newTags].map((t) => t.id)

  return json({
    title: norm.title,
    japaneseName: norm.originalWork ?? "",
    englishName: norm.englishName ?? "",
    aliases: (norm.aliases ?? []).join(", "),
    releaseDate: norm.releaseDate ?? null,
    description: norm.description ?? "",
    studioName: norm.studioName ?? "",
    tagIds: allTagIds,
    tagNames: [...existingTags, ...newTags].map((t) => ({ id: t.id, name: t.name })),
    creators: (norm.creators ?? []).map((c) => ({
      vndbId: c.sourceId ?? "",
      name: c.name,
      nameJa: c.nameJa ?? "",
      role: c.role,
    })),
  })
})
