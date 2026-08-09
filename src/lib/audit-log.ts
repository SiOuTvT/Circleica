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
    // 系统级操作（如后台 tagGroup 更新传 "ADMIN"）无真实用户时跳过，避免外键违反噪音。
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!userExists) return
    await prisma.auditLog.create({
      data: {
        userId,
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