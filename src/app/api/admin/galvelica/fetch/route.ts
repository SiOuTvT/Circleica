import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { getOrCreateWorkFromSource } from "@/lib/galvelica/work-service"
import { getAdapter } from "@/lib/galvelica/sources"
import type { SourceKey } from "@/lib/galvelica/sources/types"
import { vndbClient } from "@/lib/vndb"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const maxDuration = 300

export const POST = withHandler(async (req) => {
  await requireAdminRole()

  const body = await safeParseJson(req)
  const { sources, ids, doujinOnly, overwrite, maxDurationSec, maxItems } = body as {
    sources?: unknown
    ids?: unknown
    doujinOnly?: boolean
    overwrite?: boolean
    maxDurationSec?: number
    maxItems?: number
  }

  if (!Array.isArray(sources) || sources.length === 0) {
    throw new AppError("请选择至少一个拉取源", "VALIDATION_ERROR", 422)
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError("请提供作品 ID 列表", "VALIDATION_ERROR", 422)
  }

  // 校验源合法：未注册（含已移除的国内源）一律拒绝
  const requested = sources as SourceKey[]
  for (const s of requested) {
    if (!getAdapter(s)) {
      throw new AppError(`未知或不支持的源：${String(s)}`, "VALIDATION_ERROR", 422)
    }
  }

  const idList = (ids as unknown[]).map((x) => String(x).trim()).filter(Boolean)
  const limit = Math.min(Number(maxItems) || idList.length, 500)
  const durationMs = (Number(maxDurationSec) || 0) * 1000
  const deadline = durationMs > 0 ? Date.now() + durationMs : 0

  const results: { source: string; externalId: string; status: string; reason?: string; workId?: string }[] = []
  let created = 0
  let skipped = 0
  let filtered = 0
  let failed = 0
  const start = Date.now()

  outer: for (const source of requested) {
    for (const externalId of idList) {
      if (results.length >= limit) break outer
      if (deadline && Date.now() > deadline) break outer
      try {
        // 重复数据处理：若已存在该 (source, externalId) 源，默认跳过（幂等去重）
        const existing = await prisma.workSource.findFirst({
          where: { source, externalId },
          select: { workId: true },
        })
        if (existing && !overwrite) {
          skipped++
          results.push({ source, externalId, status: "skipped", reason: "已存在", workId: existing.workId })
          continue
        }

        // 定向同人（仅 VNDB 具备校验能力）：过滤掉非同人 / 未找到的作品
        if (doujinOnly && source === "VNDB") {
          const v = await vndbClient.validateDoujinWork(externalId)
          if (!v.isValid) {
            filtered++
            results.push({ source, externalId, status: "filtered", reason: "未找到作品" })
            continue
          }
          if (!v.isDoujin) {
            filtered++
            results.push({ source, externalId, status: "filtered", reason: "非同人" })
            continue
          }
        }

        const workId = await getOrCreateWorkFromSource(source, externalId)
        if (!workId) {
          failed++
          results.push({ source, externalId, status: "failed", reason: "拉取失败" })
          continue
        }
        created++
        results.push({ source, externalId, status: "created", workId })
      } catch (e) {
        failed++
        results.push({
          source,
          externalId,
          status: "failed",
          reason: e instanceof Error ? e.message : String(e),
        })
        logger.db.warn(`[GalvelicaFetch] 单条失败 ${source}:${externalId}`, {
          err: e instanceof Error ? e : String(e),
        })
      }
    }
  }

  return json({
    message: `拉取完成：新建 ${created}，跳过(已存在) ${skipped}，过滤(非同人) ${filtered}，失败 ${failed}，耗时 ${((Date.now() - start) / 1000).toFixed(1)}s`,
    created,
    skipped,
    filtered,
    failed,
    results,
  })
})
