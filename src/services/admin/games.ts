/**
 * Admin Service — 游戏管理（adminGameService / adminReviewService / linkGameStudios）
 * 从 src/services/admin.ts 拆分而来，保持导出名与签名完全一致。
 */

import { adminGameRepo, adminReviewRepo } from "@/repositories/admin"
import { NotFoundError, ValidationError } from "@/lib/errors"
import type { Prisma, GameStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"
import { ensurePresetTagGroups } from "@/lib/preset-tag-groups"
import { cache } from "@/lib/redis"
import { revalidatePath } from "next/cache"

/**
 * 把一组创作者（来自 VNDB 拉取或手动添加）解析并关联到游戏。
 * 规则：Creator 只在「保存游戏」时 upsert（按 vndbId 优先、name 兜底），
 * 绝不提前写库；关联统一先删后建，保证与本次提交完全一致。
 * 必须在事务（tx）内调用，确保创作者与游戏、标签的原子性。
 */
async function linkGameCreators(
  tx: Prisma.TransactionClient,
  creators: unknown,
  gameId: string,
) {
  if (!Array.isArray(creators) || creators.length === 0) return
  const links: { gameId: string; creatorId: string; role: string }[] = []
  for (const c of creators as Array<{ vndbId?: string; name?: string; nameJa?: string; role?: string }>) {
    const vndbId = c.vndbId ? String(c.vndbId).trim() : ""
    const name = c.name ? String(c.name).trim() : ""
    if (!name) continue
    // Creator.vndbId 非唯一索引，手动 upsert：优先 vndbId，其次 name
    let creator = vndbId ? await tx.creator.findFirst({ where: { vndbId }, select: { id: true } }) : null
    if (!creator && name) creator = await tx.creator.findFirst({ where: { name }, select: { id: true } })
    if (!creator) {
      creator = await tx.creator.create({
        data: { vndbId, name, nameJa: c.nameJa ? String(c.nameJa) : "" },
        select: { id: true },
      })
    }
    links.push({ gameId, creatorId: creator.id, role: c.role || "other" })
  }
  // 全量替换该游戏的创作者关联，保证与本次提交完全一致
  await tx.gameCreator.deleteMany({ where: { gameId } })
  if (links.length > 0) {
    await tx.gameCreator.createMany({ data: links, skipDuplicates: true })
  }
}

/**
 * 把一组制作组（来自 VNDB 拉取或手动添加，字符串名称数组）归一后关联到游戏。
 * 规则：Studio 按 normalizedName（小写 trim）upsert（展示名取首次提供的写法，
 * 后续更新不覆盖，保留规范名）；关联先删后建，保证与本次提交完全一致。
 * aliases 在摄入期收集原始写法（JSON 数组）。必须在事务（tx）内调用。
 */
export async function linkGameStudios(
  tx: Prisma.TransactionClient,
  studios: unknown,
  gameId: string,
) {
  // 非数组（如 undefined）视为「不修改关联」，直接跳过，保留现有关联；空数组则清空关联
  if (!Array.isArray(studios)) return
  const links: { gameId: string; studioId: string; role: string | null }[] = []
  for (const raw of studios as unknown[]) {
    const name = typeof raw === "string" ? raw.trim() : ""
    if (!name) continue
    const normalized = name.toLowerCase()
    const studio = await tx.studio.upsert({
      where: { normalizedName: normalized },
      update: {},
      create: { normalizedName: normalized, displayName: name, aliases: JSON.stringify([name]) },
      select: { id: true },
    })
    links.push({ gameId, studioId: studio.id, role: null })
  }
  // 全量替换该游戏的制组关联，保证与本次提交完全一致
  await tx.gameStudio.deleteMany({ where: { gameId } })
  if (links.length > 0) {
    await tx.gameStudio.createMany({ data: links, skipDuplicates: true })
  }
}

// ── 游戏管理 ────────────────────────

export const adminGameService = {
  getPaginated(page: number, search?: string) { return adminGameRepo.findPaginated(page, 20, search) },

  async create(data: Record<string, unknown>, publisherId: string) {
    if (!data.title?.toString().trim()) throw new ValidationError("游戏标题不能为空")
    // 预创建预设标签组（幂等，仅确保 preset_detail_header 存在；不写任何业务数据）
    await ensurePresetTagGroups()

    const game = await prisma.$transaction(async (tx) => {
      const created = await tx.game.create({
        data: {
          title: String(data.title).trim(),
          originalWork: data.originalWork ? String(data.originalWork).trim() : "",
          description: data.description ? String(data.description).trim() : "",
          coverImage: data.coverImage ? String(data.coverImage).trim() : "",
          status: (data.status as GameStatus) || "FINISHED",
          isNsfw: Boolean(data.isNsfw),
          vndbId: data.vndbId ? String(data.vndbId).trim() : "",
          releaseDate: data.releaseDate ? new Date(String(data.releaseDate)) : null,
          gameDuration: data.gameDuration ? String(data.gameDuration).trim() : "",
          englishName: data.englishName ? String(data.englishName).trim() : "",
          aliases: data.aliases ? String(data.aliases).trim() : "",
          // 截图（VNDB screenshots 或手动上传，均为 URL 字符串数组，存 Json）
          screenshots: Array.isArray(data.screenshots)
            ? (data.screenshots as unknown[]).filter((x) => typeof x === "string")
            : [],
          // 平台（VNDB platforms 代码数组，存 Json）
          platforms: Array.isArray(data.platforms)
            ? (data.platforms as unknown[]).filter((x) => typeof x === "string")
            : [],
          // 官方网站（VNDB 无干净官网字段，当前仅人工填写）
          officialWebsite: data.officialWebsite ? String(data.officialWebsite).trim() : "",
          // 游戏语言（VNDB languages 代码数组，存 Json）
          languages: Array.isArray(data.languages)
            ? (data.languages as unknown[]).filter((x) => typeof x === "string")
            : [],
          // 原始语言（VNDB olang 单值代码，存 String）
          originalLanguage: data.originalLanguage ? String(data.originalLanguage).trim() : "",
          // 年龄分级（手动维护，存 String：0/12/15/18；VNDB 无干净来源）
          ageRating: data.ageRating ? String(data.ageRating).trim() : "",
          publisherId,
          isPublished: data.isPublished === true,
        },
      })

      // 处理标签关联（含 VNDB 拉取的草稿标签：保存时才创建缺失标签并关联）
      const tagIds = Array.isArray(data.tagIds) ? [...(data.tagIds as string[])] : []
      const newTagNames = Array.isArray(data.tagNames)
        ? (data.tagNames as string[]).map((n) => String(n).trim()).filter(Boolean)
        : []
      if (newTagNames.length) {
        const tagCreated = await Promise.all(
          newTagNames.map((name) =>
            tx.tag.upsert({
              where: { name },
              update: {},
              create: { name, color: "#6b7280", groupId: "preset_detail_header" },
              select: { id: true },
            }),
          ),
        )
        for (const t of tagCreated) if (!tagIds.includes(t.id)) tagIds.push(t.id)
      }
      if (tagIds.length > 0) {
        await tx.gameTag.createMany({
          data: tagIds.map((tagId: string) => ({ gameId: created.id, tagId })),
          skipDuplicates: true,
        })
      }

      // 创作者关联（VNDB 拉取的 staff：保存时才 upsert Creator 并关联，绝不提前写库）
      await linkGameCreators(tx, data.creators, created.id)
      // 制作组关联（VNDB 拉取的 devs：保存时才 upsert Studio 并关联，绝不提前写库）
      await linkGameStudios(tx, data.studios, created.id)

      return created
    })

    await logAudit({ userId: publisherId, action: "game.create", target: game.id })
    return game
  },

  async getById(id: string) {
    const game = await adminGameRepo.findById(id)
    if (!game) throw new NotFoundError("游戏")
    return game
  },

  async update(id: string, data: Record<string, unknown>) {
    if (!await adminGameRepo.exists(id)) throw new NotFoundError("游戏")
    // 预创建预设标签组（幂等，仅确保预设分组存在）
    await ensurePresetTagGroups()

    const result = await prisma.$transaction(async (tx) => {
      // 字段白名单，防止 mass assignment
      const ALLOWED = ["title", "originalWork", "description", "coverImage", "screenshots",
        "platforms", "officialWebsite", "languages", "originalLanguage", "ageRating",
        "downloadLinks", "status", "isNsfw", "vndbId", "isPublished", "releaseDate",
        "gameDuration", "englishName", "aliases", "rejectReason"]
      const safe: Record<string, unknown> = {}
      for (const k of ALLOWED) { if (k in data) safe[k] = data[k] }
      const updated = await tx.game.update({ where: { id }, data: safe })

      // 处理标签关联更新（含 VNDB 拉取的草稿标签：保存时才创建缺失标签并关联）
      if (Array.isArray(data.tagIds) || Array.isArray(data.tagNames)) {
        const tagIds = Array.isArray(data.tagIds) ? [...(data.tagIds as string[])] : []
        const newTagNames = Array.isArray(data.tagNames)
          ? (data.tagNames as string[]).map((n) => String(n).trim()).filter(Boolean)
          : []
        if (newTagNames.length) {
          const tagCreated = await Promise.all(
            newTagNames.map((name) =>
              tx.tag.upsert({
                where: { name },
                update: {},
                create: { name, color: "#6b7280", groupId: "preset_detail_header" },
                select: { id: true },
              }),
            ),
          )
          for (const t of tagCreated) if (!tagIds.includes(t.id)) tagIds.push(t.id)
        }
        await tx.gameTag.deleteMany({ where: { gameId: id } })
        if (tagIds.length > 0) {
          await tx.gameTag.createMany({
            data: tagIds.map((tagId: string) => ({ gameId: id, tagId })),
            skipDuplicates: true,
          })
        }
      }

      // 处理创作者关联更新（VNDB 拉取的 staff 只带 vndbId/name，无 creatorId：保存时 upsert Creator 再关联）
      if (Array.isArray(data.creators)) {
        await linkGameCreators(tx, data.creators, id)
      }

      // 处理制作组关联更新（VNDB 拉取的 devs 只带名称：保存时 upsert Studio 再关联）
      if (Array.isArray(data.studios)) {
        await linkGameStudios(tx, data.studios, id)
      }

      return updated
    })

    // 编辑后清后台列表缓存 + 前台列表/详情/首页网格/相关推荐，确保改完立即生效
    await cache.delByPrefix("circleica:admin:games:")
    await cache.delByPrefix("circleica:homepage:games:grid")
    await cache.delByPrefix("circleica:related:")
    revalidatePath("/admin/games")
    revalidatePath("/games")
    revalidatePath("/")
    await logAudit({ userId: "ADMIN", action: "game.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    if (!await adminGameRepo.exists(id)) throw new NotFoundError("游戏")
    const target = await prisma.game.findUnique({ where: { id }, select: { serialId: true } }).catch(() => null)
    const result = await adminGameRepo.delete(id)
    // 删除后使管理后台列表缓存立即失效，并刷新前台列表/详情/首页网格/相关推荐，确保实时刷新。
    await cache.delByPrefix("circleica:admin:games:")
    await cache.delByPrefix("circleica:homepage:games:grid")
    await cache.delByPrefix("circleica:related:")
    revalidatePath("/admin/games")
    revalidatePath("/games")
    revalidatePath("/")
    if (target?.serialId) revalidatePath(`/games/${target.serialId}`)
    await logAudit({ userId: "ADMIN", action: "game.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async batchDelete(ids: string[]) {
    if (!ids.length) throw new ValidationError("缺少游戏 ID")
    // 校验所有 id 真实存在：避免部分 id 不存在时 deleteMany 静默跳过、前端误以为全部删除成功
    const existing = await prisma.game.findMany({ where: { id: { in: ids } }, select: { id: true } })
    const existingIds = new Set(existing.map((g) => g.id))
    const missing = ids.filter((id) => !existingIds.has(id))
    if (missing.length > 0) {
      throw new ValidationError(`有 ${missing.length} 个游戏不存在，已中止删除`)
    }
    const result = await adminGameRepo.batchDelete(ids)
    await cache.delByPrefix("circleica:admin:games:")
    await cache.delByPrefix("circleica:homepage:games:grid")
    await cache.delByPrefix("circleica:related:")
    revalidatePath("/admin/games")
    revalidatePath("/games")
    revalidatePath("/")
    await logAudit({ userId: "ADMIN", action: "game.batchDelete", target: ids.join(","), detail: `${ids.length} games` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  getLogs(gameId: string) { return adminGameRepo.findLogs(gameId) },

  async createLog(gameId: string, content: string) {
    if (!content?.trim()) throw new ValidationError("日志内容不能为空")
    return adminGameRepo.createLog(gameId, content.trim())
  },
}

// ── 审核 ────────────────────────────

export const adminReviewService = {
  getPending() { return adminReviewRepo.findPending() },

  async approve(gameId: string, reviewerId: string) {
    if (!await adminGameRepo.exists(gameId)) throw new NotFoundError("游戏")
    const result = await adminReviewRepo.approve(gameId, reviewerId)
    await logAudit({ userId: "ADMIN", action: "review.approve", target: gameId }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async reject(gameId: string, reason: string, reviewerId: string) {
    if (!await adminGameRepo.exists(gameId)) throw new NotFoundError("游戏")
    if (!reason?.trim()) throw new ValidationError("拒绝原因不能为空")
    const result = await adminReviewRepo.reject(gameId, reason.trim(), reviewerId)
    await logAudit({ userId: "ADMIN", action: "review.reject", target: gameId }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}
