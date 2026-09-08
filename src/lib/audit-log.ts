import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { getOptionalAuth } from "@/lib/auth-context"

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
      // 历史代码大量传 "ADMIN"/"SYSTEM" 占位符（非真实用户），直接跳过会导致审计全丢。
      // 解析顺序：1) 当前会话的真实操作者 2) 最早的超管 3) 都没有才放弃写入。
      // 无会话上下文（脚本/定时任务）时 getOptionalAuth 返回 null，静默走兜底，不报错。
      const auth = await getOptionalAuth().catch(() => null)
      let resolved: string | null = null
      if (auth?.userId) {
        const sessionUser = await prisma.user.findUnique({ where: { id: auth.userId }, select: { id: true } })
        resolved = sessionUser?.id ?? null
      }
      if (!resolved) {
        const fallback = await prisma.user.findFirst({
          where: { role: "SUPER_ADMIN" },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        })
        resolved = fallback?.id ?? null
      }
      if (!resolved) return
      effectiveUserId = resolved
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