import { prisma } from "@/lib/prisma"
import type { NotificationType, NotificationTargetType } from "@prisma/client"

interface CreateNotificationParams {
  userId: string      // 接收通知的用户
  actorId: string     // 触发通知的用户
  type: NotificationType
  targetType: NotificationTargetType
  targetId: string    // 目标 ID
}

/**
 * 创建一条通知，自动跳过自己给自己发通知
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, actorId, type, targetType, targetId } = params

  // 不给自己发通知
  if (userId === actorId) return null

  try {
    return await prisma.notification.create({
      data: {
        userId,
        actorId,
        type,
        targetType,
        targetId,
      },
    })
  } catch {
    // 静默失败，不影响主流程
    return null
  }
}