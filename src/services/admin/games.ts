/**
 * Admin Service — 游戏管理（adminGameService / adminReviewService / linkGameStudios）
 * 从 src/services/admin.ts 拆分而来，保持导出名与签名完全一致。
 */

import { adminGameRepo, adminReviewRepo } from "@/repositories/admin"
import { NotFoundError, ValidationError } from "@/lib/errors"
import type { Prisma, GameStatus } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit-log"
import { CacheTag, gameTag } from "@/lib/cache-tags"
import { logger } from "@/lib/logger"
import { ensurePresetTagGroups } from "@/lib/preset-tag-groups"
import { cache } from "@/lib/redis"
import { revalidatePath, revalidateTag } from "next/cache"
import { slugify } from "@/lib/slug"

/**
 * 把一组创作者（来自 VNDB 拉取或手动添加）解析并关联到游戏。
 * 规则：Creator 只在「保存游戏」时 upsert（按 vndbId 优先、name 兜底），
 * 绝不提前写库；关联统一先删后建，保证与本次提交完全一致。
 * 必须在事务（tx）内调用，确保创作者与游戏、标签的原子性。
 * 返回是否新建了 Creator，供调用方在事务提交后失效创作者列表缓存。
 */
async function linkGameCreators(
  tx: Prisma.TransactionClient,
  creators: unknown,
  gameId: string,
): Promise<boolean> {
  if (!Array.isArray(creators) || creators.length === 0) return false
  const links: { gameId: string; creatorId: string; role: string }[] = []
  let createdNew = false
  for (const c of creators as Array<{ vndbId?: string; name?: string; nameJa?: string; role?: string }>) {
    const vndbId = c.vndbId ? String(c.vndbId).trim() : ""
    const name = c.name ? String(c.name).trim() : ""
    if (!name) continue
    // Creator.vndbId 非唯一索引，手动 upsert：优先 vndbId，其次 name
    let creator = vndbId ? await tx.creator.findFirst({ where: { vndbId }, select: { id: true } }) : null
    if (!creator && name) creator = await tx.creator.findFirst({ where: { name }, select: { id: true } })
    if (!creator) {
      // slug 唯一兜底（同名碰撞时追加序号）
      let slug = slugify(name)
      let n = 2
      while (await tx.creator.findUnique({ where: { slug } })) {
        slug = `${slugify(name)}-${n++}`
      }
      // 幂等创建：并发摄入时用 (name, source) 唯一约束兜底，避免重复 Creator
      creator = await tx.creator.upsert({
        where: { name_source: { name, source: "circleica" } },
        create: { vndbId, name, slug, nameJa: c.nameJa ? String(c.nameJa) : "" },
        update: {},
        select: { id: true },
      })
      createdNew = true
    }
    links.push({ gameId, creatorId: creator.id, role: c.role || "other" })
  }
  // 全量替换该游戏的创作者关联，保证与本次提交完全一致
  await tx.gameCreator.deleteMany({ where: { gameId } })
  if (links.length > 0) {
    await tx.gameCreator.createMany({ data: links, skipDuplicates: true })
  }
  return createdNew
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
    // 兼容两种写法：旧式字符串数组（仅名称，身份留空）；新式 { name, role } 对象。
    const name = typeof raw === "string" ? raw.trim() : raw && typeof raw === "object" && "name" in raw ? String((raw as { name: unknown }).name ?? "").trim() : ""
    if (!name) continue
    const role =
      raw && typeof raw === "object" && "role" in raw ? (typeof (raw as { role: unknown }).role === "string" ? ((raw as { role: unknown }).role as string) : null) : null
    const normalized = name.toLowerCase()
    const studio = await tx.studio.upsert({
      where: { normalizedName: normalized },
      update: {},
      create: { normalizedName: normalized, displayName: name, aliases: JSON.stringify([name]), slug: slugify(name) },
      select: { id: true },
    })
    links.push({ gameId, studioId: studio.id, role })
  }
  // 全量替换该游戏的制组关联，保证与本次提交完全一致（含身份）
  await tx.gameStudio.deleteMany({ where: { gameId } })
  if (links.length > 0) {
    await tx.gameStudio.createMany({ data: links, skipDuplicates: true })
  }
}

// ── 游戏管理 ────────────────────────

export const adminGameService = {
  getPaginated(page: number, limit?: number, search?: string) { return adminGameRepo.findPaginated(page, limit ?? 20, search) },

  async create(data: Record<string, unknown>, publisherId: string) {
    if (!data.title?.toString().trim()) throw new ValidationError("游戏标题不能为空")
    // 预创建预设标签组（幂等，仅确保 preset_detail_header 存在；不写任何业务数据）
    await ensurePresetTagGroups()

    let createdNewCreators = false
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
          newTagNames.map(async (name) => {
            // slug 唯一兜底（同名碰撞时追加序号）
            let tagSlug = slugify(name)
            let m = 2
            while (await tx.tag.findUnique({ where: { slug: tagSlug } })) {
              tagSlug = `${slugify(name)}-${m++}`
            }
            return tx.tag.upsert({
              where: { name },
              // 复用同名标签时强制归属主站，避免串入副站/VNDB 同名标签；新建也明确 source。
              // 拉取的标签此时仅登记为「草稿关联」，游戏发布( isPublished )后才计入主站标签体系。
              // 更新时也强制归入详情页标签组，否则旧标签(VNDB/早期导入)会一直 groupId=NULL 变成未分组。
              update: { source: "circleica", groupId: "preset_detail_header" },
              create: { name, slug: tagSlug, color: "#6b7280", groupId: "preset_detail_header", source: "circleica" },
              select: { id: true },
            })
          }),
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
      createdNewCreators = await linkGameCreators(tx, data.creators, created.id)
      // 制作组关联（VNDB 拉取的 devs：保存时才 upsert Studio 并关联，绝不提前写库）
      await linkGameStudios(tx, data.studios, created.id)

      return created
    })

    // 导入可能 upsert 出新 Creator：事务提交后再清后台创作者列表缓存（不在事务内删缓存）
    if (createdNewCreators) {
      await cache.delByPrefix("circleica:admin:creators:")
      revalidatePath("/admin/creators")
    }

    await logAudit({ userId: publisherId, action: "game.create", target: game.id, detail: `《${game.title}》` })
    return game
  },

  async getById(id: string) {
    const game = await adminGameRepo.findById(id)
    if (!game) throw new NotFoundError("游戏")
    return game
  },

  async update(id: string, data: Record<string, unknown>) {
    // 取改前记录：既做存在性校验，也供审计比对「真正变化的字段」
    const existing = await prisma.game.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError("游戏")
    const prev = existing as unknown as Record<string, unknown>
    // 预创建预设标签组（幂等，仅确保预设分组存在）
    await ensurePresetTagGroups()

    // 关联字段（标签/创作者/制作组）不在 ALLOWED 白名单里，单独记录前后数量写进审计 detail。
    // 只在本次请求确实要动这些关联时才查，取不到旧值就跳过（不报错）。
    const touchTags = Array.isArray(data.tagIds) || Array.isArray(data.tagNames)
    const touchCreators = Array.isArray(data.creators)
    const touchStudios = Array.isArray(data.studios)
    const prevTagCount = touchTags
      ? await prisma.gameTag.findMany({ where: { gameId: id }, select: { tagId: true } }).then((r) => r.length).catch(() => null)
      : null
    const prevCreatorCount = touchCreators
      ? await prisma.gameCreator.count({ where: { gameId: id } }).catch(() => null)
      : null
    const prevStudioCount = touchStudios
      ? await prisma.gameStudio.count({ where: { gameId: id } }).catch(() => null)
      : null

    // 白名单过滤后，值真正发生变化的字段名，供审计日志 detail 使用
    let changedFields = ""
    let createdNewCreators = false

    const result = await prisma.$transaction(async (tx) => {
      // 字段白名单，防止 mass assignment
      const ALLOWED = ["title", "originalWork", "description", "coverImage", "screenshots",
        "platforms", "officialWebsite", "languages", "originalLanguage", "ageRating",
        "downloadLinks", "status", "isNsfw", "vndbId", "isPublished", "releaseDate",
        "gameDuration", "englishName", "aliases", "rejectReason"]
      const safe: Record<string, unknown> = {}
      for (const k of ALLOWED) { if (k in data) safe[k] = data[k] }
      // releaseDate 可能是 "YYYY-MM-DD" 纯日期字符串，Prisma 需要完整 ISO-8601 DateTime
      if (typeof safe.releaseDate === "string" && safe.releaseDate) {
        safe.releaseDate = new Date(safe.releaseDate + "T00:00:00.000Z")
      }
      changedFields = Object.keys(safe)
        .filter((k) => JSON.stringify(safe[k]) !== JSON.stringify(prev[k]))
        .join(",")
      const updated = await tx.game.update({ where: { id }, data: safe })

      // 处理标签关联更新（含 VNDB 拉取的草稿标签：保存时才创建缺失标签并关联）
      if (Array.isArray(data.tagIds) || Array.isArray(data.tagNames)) {
        const tagIds = Array.isArray(data.tagIds) ? [...(data.tagIds as string[])] : []
        const newTagNames = Array.isArray(data.tagNames)
          ? (data.tagNames as string[]).map((n) => String(n).trim()).filter(Boolean)
          : []
        if (newTagNames.length) {
          const tagCreated = await Promise.all(
            newTagNames.map(async (name) => {
              // slug 唯一兜底（同名碰撞时追加序号）
              let tagSlug = slugify(name)
              let m = 2
              while (await tx.tag.findUnique({ where: { slug: tagSlug } })) {
                tagSlug = `${slugify(name)}-${m++}`
              }
              return tx.tag.upsert({
                where: { name },
                update: {},
                create: { name, slug: tagSlug, color: "#6b7280", groupId: "preset_detail_header" },
                select: { id: true },
              })
            }),
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
        createdNewCreators = await linkGameCreators(tx, data.creators, id)
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
    // A-8：详情页 Data Cache 失效（cache tag 机制，统一命名见 cache-tags.ts）
    revalidateTag(gameTag(id), { expire: 0 })
    revalidateTag(CacheTag.gameDetail, { expire: 0 })

    // 导入可能 upsert 出新 Creator：事务提交后再清后台创作者列表缓存（不在事务内删缓存）
    if (createdNewCreators) {
      await cache.delByPrefix("circleica:admin:creators:")
      revalidatePath("/admin/creators")
    }

    // 关联变更：只在新旧数量都拿得到且确实不同时才追加，取不到就跳过（不报错）
    const relationNotes: string[] = []
    if (prevTagCount !== null) {
      const next = await prisma.gameTag.findMany({ where: { gameId: id }, select: { tagId: true } }).then((r) => r.length).catch(() => null)
      if (next !== null && next !== prevTagCount) relationNotes.push(`tags=${prevTagCount}→${next}`)
    }
    if (prevCreatorCount !== null) {
      const next = await prisma.gameCreator.count({ where: { gameId: id } }).catch(() => null)
      if (next !== null && next !== prevCreatorCount) relationNotes.push(`creators=${prevCreatorCount}→${next}`)
    }
    if (prevStudioCount !== null) {
      const next = await prisma.gameStudio.count({ where: { gameId: id } }).catch(() => null)
      if (next !== null && next !== prevStudioCount) relationNotes.push(`studios=${prevStudioCount}→${next}`)
    }
    const detailParts: string[] = []
    if (changedFields) detailParts.push(`fields=${changedFields}`)
    detailParts.push(...relationNotes)
    const updateDetail = `《${result.title}》${detailParts.length ? detailParts.join(" ") : "无字段变化"}`

    await logAudit({ userId: "ADMIN", action: "game.update", target: id, detail: updateDetail }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    // 删除前取一次记录：既做存在性校验，也拿到 revalidate 用的 serialId 与审计用的标题
    const existing = await prisma.game.findUnique({ where: { id }, select: { id: true, serialId: true, title: true } })
    if (!existing) throw new NotFoundError("游戏")
    const result = await adminGameRepo.delete(id)
    // 删除后使管理后台列表缓存立即失效，并刷新前台列表/详情/首页网格/相关推荐，确保实时刷新。
    await cache.delByPrefix("circleica:admin:games:")
    await cache.delByPrefix("circleica:homepage:games:grid")
    await cache.delByPrefix("circleica:related:")
    revalidatePath("/admin/games")
    revalidatePath("/games")
    revalidatePath("/")
    if (existing.serialId) revalidatePath(`/games/${existing.serialId}`)
    // A-8：详情页 Data Cache 失效（cache tag 机制，统一命名见 cache-tags.ts）
    revalidateTag(gameTag(id), { expire: 0 })
    revalidateTag(CacheTag.gameDetail, { expire: 0 })
    await logAudit({ userId: "ADMIN", action: "game.delete", target: id, detail: `《${existing.title}》` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async batchDelete(ids: string[]) {
    if (!ids.length) throw new ValidationError("缺少游戏 ID")
    // 校验所有 id 真实存在：避免部分 id 不存在时 deleteMany 静默跳过、前端误以为全部删除成功
    const existing = await prisma.game.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
    const existingIds = new Set(existing.map((g) => g.id))
    const missing = ids.filter((id) => !existingIds.has(id))
    if (missing.length > 0) {
      throw new ValidationError(`有 ${missing.length} 个游戏不存在，已中止删除`)
    }
    // 审计 detail：列出被删游戏标题，最多 5 个，超出写「等 N 部」
    const shown = existing.slice(0, 5).map((g) => `《${g.title}》`).join("")
    const deletedDetail = existing.length > 5 ? `${shown}等 ${existing.length} 部` : shown
    const result = await adminGameRepo.batchDelete(ids)
    await cache.delByPrefix("circleica:admin:games:")
    await cache.delByPrefix("circleica:homepage:games:grid")
    await cache.delByPrefix("circleica:related:")
    revalidatePath("/admin/games")
    revalidatePath("/games")
    revalidatePath("/")
    await logAudit({ userId: "ADMIN", action: "game.batchDelete", target: ids.join(","), detail: deletedDetail }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
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
    // 用一次 findUnique 同时做存在性校验并取标题（原来只 exists，拿不到标题写不进 detail）
    const game = await prisma.game.findUnique({ where: { id: gameId }, select: { id: true, title: true } })
    if (!game) throw new NotFoundError("游戏")
    const result = await adminReviewRepo.approve(gameId, reviewerId)
    await logAudit({ userId: "ADMIN", action: "review.approve", target: gameId, detail: `《${game.title}》通过审核并发布` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async reject(gameId: string, reason: string, reviewerId: string) {
    const game = await prisma.game.findUnique({ where: { id: gameId }, select: { id: true, title: true } })
    if (!game) throw new NotFoundError("游戏")
    if (!reason?.trim()) throw new ValidationError("拒绝原因不能为空")
    const trimmed = reason.trim()
    const result = await adminReviewRepo.reject(gameId, trimmed, reviewerId)
    await logAudit({ userId: "ADMIN", action: "review.reject", target: gameId, detail: `《${game.title}》拒回：${trimmed.slice(0, 60)}` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}
