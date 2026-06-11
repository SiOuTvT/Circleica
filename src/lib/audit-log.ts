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
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        target: target ?? "",
        detail: detail ?? "",
        ip: ip ?? "",
      },
    })
  } catch {
    // don't fail the main operation on audit log failure
  }
}