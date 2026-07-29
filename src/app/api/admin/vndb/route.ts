import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { AppError } from "@/lib/errors"
import { vndbAdapter } from "@/lib/galvelica/sources"

export const POST = withHandler(async (req) => {
  await requireAdminRole()

  const { vndbId } = await safeParseJson(req)
  if (!vndbId?.trim()) {
    throw new AppError("请输入 VNDB 编号", "VALIDATION_ERROR", 422)
  }

  // 通过 Galvelica 源适配器拉取并归一化（传输层复用 VNDBClient：代理 / IPv4 / 重试 / 缓存）
  // 仅做「导入草稿」：把数据填充回后台表单，绝不在此写数据库。
  // 标签 / 关联数据在保存游戏成功后才由 adminGameService 创建并关联（见 src/services/admin.ts）。
  const payload = await vndbAdapter.fetchByExternalId(vndbId.trim())
  if (!payload) {
    throw new AppError("未找到对应的 VNDB 游戏", "NOT_FOUND", 404)
  }

  const norm = vndbAdapter.normalize(payload)
  if (!norm.title) {
    throw new AppError("未找到对应的 VNDB 游戏", "NOT_FOUND", 404)
  }

  return json({
    title: norm.title,
    japaneseName: norm.originalWork ?? "",
    englishName: norm.englishName ?? "",
    aliases: (norm.aliases ?? []).join(", "),
    releaseDate: norm.releaseDate ?? null,
    description: norm.description ?? "",
    studios: norm.studios ?? [],
    // 封面 / 时长 / 截图：拉取即填回表单草稿，保存时随游戏一并入库
    coverImage: norm.coverImage ?? "",
    gameDuration: norm.gameDuration ?? "",
    screenshots: norm.screenshots ?? [],
    // 仅返回标签名称作为草稿，不创建 Tag 记录；保存时再入库
    tagNames: (norm.tags ?? []).map((t) => t.name),
    platforms: norm.platforms ?? [],
    languages: norm.languages ?? [],
    originalLanguage: norm.originalLanguage ?? "",
    officialWebsite: norm.officialWebsite ?? "",
    creators: (norm.creators ?? []).map((c) => ({
      vndbId: c.sourceId ?? "",
      name: c.name,
      nameJa: c.nameJa ?? "",
      role: c.role,
    })),
  })
})
