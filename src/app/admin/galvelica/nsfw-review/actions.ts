"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireSiteAdmin } from "@/lib/auth-context"
import { cache } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { logAudit } from "@/lib/audit-log"

/** 封面露骨度分级：0=安全 1=暗示 2=露骨（-1=未知，留待审核） */
export const COVER_SEXUAL_LABELS: Record<number, string> = {
  0: "安全",
  1: "暗示",
  2: "露骨",
}

/**
 * 人工标定某作品的封面露骨度。
 * 覆盖 VNDB 自动评级/NSFWJS 兜底，是「体验档」待审队列的最终裁决入口。
 */
export async function setWorkCoverSexual(formData: FormData): Promise<void> {
  await requireSiteAdmin("galvelica")
  const workId = String(formData.get("workId") ?? "").trim()
  const levelRaw = Number(formData.get("level"))
  if (!workId) throw new ValidationError("缺少 workId")
  if (![0, 2].includes(levelRaw)) throw new ValidationError("分级只能是 SFW(0) 或 NSFW(2)")

  // 一次查询同时带出标题与旧分级，供审计 detail 使用（不为审计多打查询）
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: { id: true, title: true, coverSexual: true, coverSexualSource: true },
  })
  if (!work) throw new NotFoundError("作品")

  await prisma.work.update({
    where: { id: workId },
    data: { coverSexual: levelRaw, coverSexualSource: "manual" },
  })

  // 人工标定必须留痕（分级写中文，未知 -1 显示「未定」）
  const levelLabel = (v: number | null | undefined) => (v == null ? "未定" : COVER_SEXUAL_LABELS[v] ?? "未定")
  await logAudit({
    userId: "ADMIN",
    action: "work.coverReview",
    target: workId,
    detail: `《${work.title}》封面分级 ${levelLabel(work.coverSexual)}→${levelLabel(levelRaw)}（人工）`,
  }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))

  // 封面分级影响前台展示 → 清副站前台缓存 + 刷新列表/审核页
  await cache.delByPrefix("circleica:galvelica:").catch(() => {})
  await cache.delByPrefix("circleica:admin:galvelica:works:").catch(() => {})
  revalidatePath("/admin/galvelica/nsfw-review")
  revalidatePath("/galvelica")
  revalidatePath("/galvelica/works")

  logger.db.info(`[NsfwReview] 人工标定 coverSexual=${levelRaw} → work ${workId}`)
}
