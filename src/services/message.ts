/**
 * 私聊 Service — 发起会话（扣印记防滥用）、发消息、列会话、读消息、标记已读
 *
 * 印记规则：
 *  - 发起会话消耗固定 5 印记（防陌生人轰炸），两人之间唯一会话，不重复扣费
 *  - 余额模型与印记商店一致：可用 = 总印记 - marksSpent（扣费走 updateMany 条件更新，并发安全）
 *  - 回复方不扣印记
 */

import { prisma } from "@/lib/prisma"
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from "@/lib/errors"
import { checkAchievements } from "@/lib/achievements"

/** 发起一次私聊会话消耗的印记 */
export const MESSAGE_COST = 5
/** 单条消息最大长度 */
const MAX_CONTENT_LENGTH = 2000

export const messageService = {
  /**
   * 发起会话（或复用已存在的会话）。
   * - 目标是自己 → 拒绝
   * - 已存在会话 → 直接返回（不扣印记）
   * - 新会话 → 事务内校验可用印记 ≥ MESSAGE_COST，updateMany 原子扣费 + 建会话
   */
  async startConversation(userId: string, participantId: string) {
    if (!participantId) throw new ValidationError("缺少私聊对象")
    if (userId === participantId) throw new ValidationError("不能给自己发私聊")

    const target = await prisma.user.findUnique({ where: { id: participantId }, select: { id: true } })
    if (!target) throw new NotFoundError("用户")

    // 已有会话直接复用（两人之间唯一）
    const existing = await prisma.conversation.findUnique({
      where: { initiatorId_participantId: { initiatorId: userId, participantId } },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    })
    if (existing) return { conversation: existing, cost: 0 }

    // 事务：计算可用印记 → 原子扣费 → 建会话
    const conversation = await prisma.$transaction(async (tx) => {
      const [marksSum, user] = await Promise.all([
        tx.checkIn.aggregate({ where: { userId }, _sum: { marks: true } }),
        tx.user.findUnique({ where: { id: userId }, select: { marksSpent: true } }),
      ])
      const totalMarks = marksSum._sum.marks ?? 0
      const available = totalMarks - (user?.marksSpent ?? 0)
      if (available < MESSAGE_COST) {
        throw new ForbiddenError(`印记不足，发起私聊需要 ${MESSAGE_COST} 印记（当前可用 ${available}）`)
      }
      const updated = await tx.user.updateMany({
        where: { id: userId, marksSpent: { lte: totalMarks - MESSAGE_COST } },
        data: { marksSpent: { increment: MESSAGE_COST } },
      })
      if (updated.count === 0) {
        throw new ForbiddenError("印记不足，发起私聊失败")
      }
      return tx.conversation.create({
        data: { initiatorId: userId, participantId, initiatorMarkSpent: MESSAGE_COST },
        include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      })
    })
    // 发私聊本身是互动，触发成就检查（fire-and-forget，不阻塞）
    checkAchievements(userId).catch(() => {})
    return { conversation, cost: MESSAGE_COST }
  },

  /** 发消息（双方任一均可；会话必须存在且本人是参与者） */
  async sendMessage(userId: string, conversationId: string, content: string) {
    const text = String(content || "").trim()
    if (!text) throw new ValidationError("消息内容不能为空")
    if (text.length > MAX_CONTENT_LENGTH) throw new ValidationError(`消息过长（最多 ${MAX_CONTENT_LENGTH} 字）`)

    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conv) throw new NotFoundError("会话")
    if (conv.initiatorId !== userId && conv.participantId !== userId) {
      throw new ForbiddenError("无权操作该会话")
    }

    const message = await prisma.message.create({
      data: { conversationId, senderId: userId, content: text },
      include: { sender: { select: { id: true, username: true, avatar: true } } },
    })
    // 更新会话的最后消息时间（会话排序用）
    await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } })
    return message
  },

  /** 我的会话列表（按最近消息时间倒序） */
  async listConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ initiatorId: userId }, { participantId: userId }] },
      orderBy: { lastMessageAt: "desc" },
      include: {
        initiator: { select: { id: true, username: true, avatar: true } },
        participant: { select: { id: true, username: true, avatar: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: { where: { isRead: false, senderId: { not: userId } } } } },
      },
    })
    return conversations
  },

  /** 打开会话：校验权限 + 读消息 + 标记对方消息已读 */
  async getConversation(userId: string, conversationId: string) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        initiator: { select: { id: true, username: true, avatar: true } },
        participant: { select: { id: true, username: true, avatar: true } },
      },
    })
    if (!conv) throw new NotFoundError("会话")
    if (conv.initiatorId !== userId && conv.participantId !== userId) {
      throw new ForbiddenError("无权查看该会话")
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, username: true, avatar: true } } },
    })

    // 将对方发来的未读消息标记为已读
    const unreadCount = await prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    })

    return { conversation: conv, messages, newlyRead: unreadCount.count }
  },

  /** 未读私聊总数（导航角标） */
  async getUnreadCount(userId: string) {
    const convs = await prisma.conversation.findMany({
      where: { OR: [{ initiatorId: userId }, { participantId: userId }] },
      select: { initiatorId: true, participantId: true },
    })
    if (convs.length === 0) return 0
    // 统计对方发来且未读的消息数
    const ids = convs.map((c) => c.id)
    const unread = await prisma.message.count({
      where: { conversationId: { in: ids }, senderId: { not: userId }, isRead: false },
    })
    return unread
  },
}
