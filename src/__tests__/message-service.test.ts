/**
 * 私聊 Service 测试：发起会话扣印记 / 复用不重复扣 / 消息发送权限 / 未读数
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    conversation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    checkIn: { aggregate: jest.fn() },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/achievements", () => ({
  checkAchievements: jest.fn().mockResolvedValue(undefined),
}))

import { messageService, MESSAGE_COST } from "@/services/message"
import { prisma } from "@/lib/prisma"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"

const mockPrisma = jest.mocked(prisma)

beforeEach(() => {
  jest.clearAllMocks()
})

// ── startConversation ────────────────────────────────────────────

describe("messageService.startConversation", () => {
  it("rejects missing participant", async () => {
    await expect(messageService.startConversation("u1", "")).rejects.toThrow(ValidationError)
  })

  it("rejects talking to self", async () => {
    await expect(messageService.startConversation("u1", "u1")).rejects.toThrow("不能给自己发私聊")
  })

  it("throws NotFound for missing target", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    await expect(messageService.startConversation("u1", "ghost")).rejects.toThrow(NotFoundError)
  })

  it("reuses existing conversation without charging marks", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u2" } as never)
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      initiatorId: "u1",
      participantId: "u2",
      messages: [],
    } as never)

    const result = await messageService.startConversation("u1", "u2")
    expect(result.cost).toBe(0)
    expect(result.conversation.id).toBe("conv-1")
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it("rejects when marks insufficient", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u2" } as never)
    mockPrisma.conversation.findUnique.mockResolvedValue(null)
    // 事务内：总印记 3 < MESSAGE_COST(5)
    mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      const tx = {
        checkIn: { aggregate: jest.fn().mockResolvedValue({ _sum: { marks: 3 } }) },
        user: { findUnique: jest.fn().mockResolvedValue({ marksSpent: 0 }) },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })
    await expect(messageService.startConversation("u1", "u2")).rejects.toThrow(ForbiddenError)
    await expect(messageService.startConversation("u1", "u2")).rejects.toThrow(/印记不足/)
  })

  it("creates conversation and charges marks in transaction", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u2" } as never)
    mockPrisma.conversation.findUnique.mockResolvedValue(null)
    mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      const tx = {
        checkIn: { aggregate: jest.fn().mockResolvedValue({ _sum: { marks: 50 } }) },
        user: {
          findUnique: jest.fn().mockResolvedValue({ marksSpent: 0 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        conversation: { create: jest.fn().mockResolvedValue({ id: "conv-new", messages: [] }) },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })

    const result = await messageService.startConversation("u1", "u2")
    expect(result.cost).toBe(MESSAGE_COST)
    expect(result.conversation.id).toBe("conv-new")
    // 断言事务中扣费是 updateMany 条件更新（防并发超扣）
    const txFn = mockPrisma.$transaction.mock.calls[0][0] as (t: never) => Promise<unknown>
    // 直接执行 tx 回调检查内部逻辑
    const spyUpdateMany = jest.fn().mockResolvedValue({ count: 1 })
    await txFn({
      checkIn: { aggregate: jest.fn().mockResolvedValue({ _sum: { marks: 50 } }) },
      user: {
        findUnique: jest.fn().mockResolvedValue({ marksSpent: 0 }),
        updateMany: spyUpdateMany,
      },
      conversation: { create: jest.fn().mockResolvedValue({ id: "conv-new", messages: [] }) },
    } as never)
    expect(spyUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "u1", marksSpent: { lte: 45 } }),
      data: { marksSpent: { increment: MESSAGE_COST } },
    })
  })

  it("rejects concurrent race when updateMany affects 0 rows", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u2" } as never)
    mockPrisma.conversation.findUnique.mockResolvedValue(null)
    mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      const tx = {
        checkIn: { aggregate: jest.fn().mockResolvedValue({ _sum: { marks: 50 } }) },
        user: {
          findUnique: jest.fn().mockResolvedValue({ marksSpent: 0 }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }), // 并发已扣走
        },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })
    await expect(messageService.startConversation("u1", "u2")).rejects.toThrow(ForbiddenError)
  })
})

// ── sendMessage ──────────────────────────────────────────────────

describe("messageService.sendMessage", () => {
  it("rejects empty content", async () => {
    await expect(messageService.sendMessage("u1", "c1", "   ")).rejects.toThrow("消息内容不能为空")
  })

  it("rejects overlong content", async () => {
    await expect(messageService.sendMessage("u1", "c1", "x".repeat(2001))).rejects.toThrow("消息过长")
  })

  it("throws NotFound for missing conversation", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue(null)
    await expect(messageService.sendMessage("u1", "ghost", "hi")).rejects.toThrow(NotFoundError)
  })

  it("forbids non-participant from sending", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({ id: "c1", initiatorId: "u1", participantId: "u2" } as never)
    await expect(messageService.sendMessage("u3", "c1", "hi")).rejects.toThrow(ForbiddenError)
  })

  it("creates message and updates lastMessageAt", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({ id: "c1", initiatorId: "u1", participantId: "u2" } as never)
    mockPrisma.message.create.mockResolvedValue({
      id: "m1",
      conversationId: "c1",
      senderId: "u1",
      content: "hi",
      isRead: false,
      createdAt: new Date(),
      sender: { id: "u1", username: "u1name", avatar: "" },
    } as never)
    mockPrisma.conversation.update.mockResolvedValue({} as never)

    const msg = await messageService.sendMessage("u1", "c1", "hi")
    expect(msg.content).toBe("hi")
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: expect.objectContaining({ lastMessageAt: expect.any(Date) }),
    })
  })
})

// ── getUnreadCount ───────────────────────────────────────────────

describe("messageService.getUnreadCount", () => {
  it("returns 0 when no conversations", async () => {
    mockPrisma.conversation.findMany.mockResolvedValue([])
    const n = await messageService.getUnreadCount("u1")
    expect(n).toBe(0)
  })

  it("counts unread messages from the other party", async () => {
    mockPrisma.conversation.findMany.mockResolvedValue([{ id: "c1" }] as never)
    mockPrisma.message.count.mockResolvedValue(3)
    const n = await messageService.getUnreadCount("u1")
    expect(n).toBe(3)
    expect(mockPrisma.message.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ senderId: { not: "u1" }, isRead: false }),
    })
  })
})
