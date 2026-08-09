import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

/**
 * 记录管理操作到审计日志
 */
export async function logAudit({
  userId,
  action,
  target,
  detail,
  ip,
}: {
  userId: string
  action: string
  target?: string
  detail?: string
  ip?: string
}) {
  try {
    // userId 必须真实存在（AuditLog.userId 为必填外键）。
    let effectiveUserId = userId
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!userExists) {
      // 历史代码大量使用 "ADMIN"/"SYSTEM" 占位符（非真实用户），直接跳过会导致审计全丢。
      // 兜底：取一个真实超管作为操作者（无超管则跳过），保证关键操作有审计记录。
      const fallback = await prisma.user.findFirst({
        where: { role: "SUPER_ADMIN" },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      })
      if (!fallback) return
      effectiveUserId = fallback.id
    }
    await prisma.auditLog.create({
      data: {
        userId: effectiveUserId,
        action,
        target: target ?? "",
        detail: detail ?? "",
        ip: ip ?? "",
      },
    })
  } catch (err) {
    logger.db.warn("[auditLog] write audit log failed", { error: err instanceof Error ? err.message : String(err) })
  }
}