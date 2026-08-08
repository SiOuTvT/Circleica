/**
 * user-service 补充测试：verifyEmail / resetPassword / updateProfile / checkin / follow / collection / comment
 * @jest-environment node
 */

jest.mock("@/repositories/user", () => ({
  userRepo: {
    findById: jest.fn(),
    findByUsername: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateProfile: jest.fn(),
    updateAvatarFrame: jest.fn(),
    getStats: jest.fn(),
  },
  collectionRepo: {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  notificationRepo: { create: jest.fn().mockResolvedValue(undefined) },
  followRepo: {
    isFollowing: jest.fn(),
    follow: jest.fn(),
    unfollow: jest.fn(),
  },
  commentRepo: {
    findById: jest.fn(),
    delete: jest.fn(),
    toggleLike: jest.fn(),
  },
  searchRepo: {},
  checkinRepo: {
    findByDate: jest.fn(),
    create: jest.fn(),
    getUserStreak: jest.fn(),
  },
  profileRepo: {},
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    siteSetting: { findUnique: jest.fn() },
    emailVerificationToken: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    avatarFrame: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2b$12$hashed"),
  compare: jest.fn().mockResolvedValue(true),
}))

jest.mock("@/lib/email", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailChangeEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/service-config", () => ({
  getEmailConfigured: jest.fn().mockReturnValue(true),
  getRedisConfig: jest.fn().mockReturnValue(null),
}))

jest.mock("@/lib/logger", () => ({
  logger: {
    system: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    db: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  },
}))

jest.mock("@/lib/storage", () => ({
  deleteByUrl: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/achievements", () => ({
  checkAchievements: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/home-stats", () => ({
  invalidateHomeStats: jest.fn().mockResolvedValue(undefined),
}))

import { Prisma } from "@prisma/client"
import { authService, userService, checkinService, followService, collectionService, commentService } from "@/services/user"
import { userRepo, checkinRepo, followRepo, commentRepo, collectionRepo, notificationRepo } from "@/repositories/user"
import { prisma } from "@/lib/prisma"
import { deleteByUrl } from "@/lib/storage"
import { checkAchievements } from "@/lib/achievements"
import { invalidateHomeStats } from "@/lib/home-stats"
import { ValidationError, ConflictError, NotFoundError, UnauthorizedError } from "@/lib/errors"

const mockUserRepo = jest.mocked(userRepo)
const mockPrisma = jest.mocked(prisma)
const mockCheckinRepo = jest.mocked(checkinRepo)
const mockFollowRepo = jest.mocked(followRepo)
const mockCommentRepo = jest.mocked(commentRepo)
const mockCollectionRepo = jest.mocked(collectionRepo)

beforeEach(() => {
  jest.clearAllMocks()
})

// ── verifyEmail ──────────────────────────────────────────────────

describe("authService.verifyEmail", () => {
  const validRecord = {
    id: "tok-1",
    userId: "user-1",
    email: "test@example.com",
    tokenHash: "hash",
    type: "verify",
    usedAt: null,
    expiresAt: new Date(Date.now() + 3600_000),
  }

  it("rejects empty token", async () => {
    await expect(authService.verifyEmail("")).rejects.toThrow("验证令牌不能为空")
    await expect(authService.verifyEmail(undefined as never)).rejects.toThrow(ValidationError)
  })

  it("rejects token not found", async () => {
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue(null)
    await expect(authService.verifyEmail("raw-token")).rejects.toThrow("验证链接无效")
  })

  it("rejects already-used token", async () => {
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({ ...validRecord, usedAt: new Date() } as never)
    await expect(authService.verifyEmail("raw-token")).rejects.toThrow("验证链接已使用")
  })

  it("rejects expired token", async () => {
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({ ...validRecord, expiresAt: new Date(Date.now() - 1000) } as never)
    await expect(authService.verifyEmail("raw-token")).rejects.toThrow("验证链接已过期")
  })

  it("verifies user and marks token used in a transaction", async () => {
    mockPrisma.emailVerificationToken.findUnique.mockResolvedValue(validRecord as never)

    const result = await authService.verifyEmail("raw-token")
    expect(result).toEqual({ success: true, email: "test@example.com" })
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({ emailVerified: true }),
    })
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })
})

// ── resetPassword ────────────────────────────────────────────────

describe("authService.resetPassword", () => {
  it("rejects empty token", async () => {
    await expect(authService.resetPassword("", "password123")).rejects.toThrow("重置令牌不能为空")
  })

  it("rejects weak password", async () => {
    await expect(authService.resetPassword("token", "123")).rejects.toThrow(ValidationError)
  })

  it("rejects invalid/expired token", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null)
    await expect(authService.resetPassword("token", "password123")).rejects.toThrow("令牌无效或已过期")
  })

  it("updates password and marks token used", async () => {
    const record = {
      id: "prt-1",
      userId: "user-1",
      token: "hash",
      expiresAt: new Date(Date.now() + 3600_000),
      usedAt: null,
    }
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue(record as never)

    const result = await authService.resetPassword("raw-token", "newpassword123")
    expect(result).toEqual({ success: true })
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })
})

// ── updateProfile ────────────────────────────────────────────────

describe("userService.updateProfile", () => {
  const baseUser = { id: "user-1", avatar: "", banner: "", password: "hash" }

  it("rejects invalid username", async () => {
    await expect(userService.updateProfile("user-1", { username: "ab" })).rejects.toThrow("用户名 3-20 个字符")
    await expect(userService.updateProfile("user-1", { username: "bad name" })).rejects.toThrow("用户名只能包含字母、数字和下划线")
  })

  it("rejects duplicate username owned by another user", async () => {
    mockUserRepo.findByUsername.mockResolvedValue({ id: "other-user" } as never)
    await expect(userService.updateProfile("user-1", { username: "taken" })).rejects.toThrow(ConflictError)
  })

  it("allows keeping own username", async () => {
    mockUserRepo.findByUsername.mockResolvedValue({ id: "user-1" } as never)
    mockPrisma.user.findUnique.mockResolvedValue(baseUser as never)
    mockUserRepo.updateProfile.mockResolvedValue({} as never)
    await userService.updateProfile("user-1", { username: "same" })
    expect(mockUserRepo.updateProfile).toHaveBeenCalled()
  })

  it("rejects javascript: avatar URL", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser as never)
    await expect(userService.updateProfile("user-1", { avatar: "javascript:alert(1)" }))
      .rejects.toThrow("头像链接格式不正确")
  })

  it("rejects data: banner URL", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser as never)
    await expect(userService.updateProfile("user-1", { banner: "data:text/html;base64,PHNjcmlwdD4=" }))
      .rejects.toThrow("封面链接格式不正确")
  })

  it("sanitizes avatar URL to http(s)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser as never)
    mockUserRepo.updateProfile.mockResolvedValue({} as never)
    await userService.updateProfile("user-1", { avatar: "https://example.com/a.png" })
    expect(mockUserRepo.updateProfile).toHaveBeenCalledWith("user-1", expect.objectContaining({ avatar: "https://example.com/a.png" }))
  })

  it("truncates bio to 500 chars", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser as never)
    mockUserRepo.updateProfile.mockResolvedValue({} as never)
    await userService.updateProfile("user-1", { bio: "x".repeat(600) })
    const call = mockUserRepo.updateProfile.mock.calls[0][1]
    expect(String(call.bio).length).toBe(500)
  })

  it("requires old password when user already has a password", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser as never)
    await expect(userService.updateProfile("user-1", { newPassword: "newpassword123" }))
      .rejects.toThrow("请输入当前密码")
  })

  it("rejects wrong old password", async () => {
    const bcrypt = jest.requireMock("bcryptjs")
    bcrypt.compare.mockResolvedValueOnce(false)
    mockPrisma.user.findUnique.mockResolvedValue(baseUser as never)
    await expect(userService.updateProfile("user-1", { oldPassword: "wrong", newPassword: "newpassword123" }))
      .rejects.toThrow("当前密码不正确")
  })

  it("deletes old avatar file only when avatar actually changed", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, avatar: "https://r2.example.com/old.png" } as never)
    mockUserRepo.updateProfile.mockResolvedValue({} as never)
    await userService.updateProfile("user-1", { avatar: "https://r2.example.com/new.png" })
    expect(deleteByUrl).toHaveBeenCalledWith("https://r2.example.com/old.png")
  })

  it("does NOT delete old avatar file when avatar unchanged", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, avatar: "https://r2.example.com/same.png" } as never)
    mockUserRepo.updateProfile.mockResolvedValue({} as never)
    await userService.updateProfile("user-1", { username: "newname" })
    expect(deleteByUrl).not.toHaveBeenCalled()
  })
})

// ── checkinService ───────────────────────────────────────────────

describe("checkinService.checkIn", () => {
  const today = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }) + "T00:00:00+08:00")

  it("rejects duplicate check-in on the same day", async () => {
    mockCheckinRepo.findByDate.mockResolvedValue({ id: "c1" } as never)
    await expect(checkinService.checkIn("user-1")).rejects.toThrow(ConflictError)
    await expect(checkinService.checkIn("user-1")).rejects.toThrow("今天已经签到过了")
  })

  it("creates check-in with marks between 1 and 10", async () => {
    mockCheckinRepo.findByDate.mockResolvedValue(null)
    mockCheckinRepo.getUserStreak.mockResolvedValue([])
    mockCheckinRepo.create.mockResolvedValue({} as never)

    await checkinService.checkIn("user-1")
    const marks = mockCheckinRepo.create.mock.calls[0][1]
    expect(marks).toBeGreaterThanOrEqual(1)
    expect(marks).toBeLessThanOrEqual(10)
  })

  it("translates P2002 race condition into friendly conflict", async () => {
    mockCheckinRepo.findByDate.mockResolvedValue(null)
    mockCheckinRepo.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" })
    )
    await expect(checkinService.checkIn("user-1")).rejects.toThrow(ConflictError)
    await expect(checkinService.checkIn("user-1")).rejects.toThrow("今天已经签到过了")
  })

  it("re-throws non-P2002 errors", async () => {
    mockCheckinRepo.findByDate.mockResolvedValue(null)
    const raw = new Error("db down")
    mockCheckinRepo.create.mockRejectedValue(raw)
    await expect(checkinService.checkIn("user-1")).rejects.toThrow("db down")
  })

  it("computes streak counting consecutive Shanghai days backwards", async () => {
    mockCheckinRepo.findByDate.mockResolvedValue(null)
    const day = (offsetDays: number) =>
      new Date(new Date(Date.now() - offsetDays * 86400_000).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }) + "T00:00:00+08:00")
    // 今天刚签到，getUserStreak 倒序返回 今天 + 昨天 → streak=2
    mockCheckinRepo.getUserStreak.mockResolvedValue([{ date: day(0) }, { date: day(1) }] as never)
    mockCheckinRepo.create.mockResolvedValue({} as never)

    const result = await checkinService.checkIn("user-1")
    expect(result.streak).toBe(2)
  })

  it("breaks streak on a gap day", async () => {
    mockCheckinRepo.findByDate.mockResolvedValue(null)
    const day = (offsetDays: number) =>
      new Date(new Date(Date.now() - offsetDays * 86400_000).toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }) + "T00:00:00+08:00")
    // 今天 + 昨天连续，但前天下线（day(3)）→ streak 止于今天+昨天=2
    mockCheckinRepo.getUserStreak.mockResolvedValue([{ date: day(0) }, { date: day(1) }, { date: day(3) }] as never)
    mockCheckinRepo.create.mockResolvedValue({} as never)

    const result = await checkinService.checkIn("user-1")
    expect(result.streak).toBe(2)
  })

  it("triggers achievement check and invalidates home stats", async () => {
    mockCheckinRepo.findByDate.mockResolvedValue(null)
    mockCheckinRepo.getUserStreak.mockResolvedValue([])
    mockCheckinRepo.create.mockResolvedValue({} as never)

    await checkinService.checkIn("user-1")
    expect(checkAchievements).toHaveBeenCalledWith("user-1")
    expect(invalidateHomeStats).toHaveBeenCalled()
  })
})

// ── followService ────────────────────────────────────────────────

describe("followService.toggle", () => {
  it("rejects following self", async () => {
    await expect(followService.toggle("user-1", "user-1")).rejects.toThrow("不能关注自己")
  })

  it("throws NotFound when target user missing", async () => {
    mockUserRepo.findById.mockResolvedValue(null)
    await expect(followService.toggle("user-1", "ghost")).rejects.toThrow(NotFoundError)
  })

  it("unfollows when already following", async () => {
    mockUserRepo.findById.mockResolvedValue({ id: "user-2" } as never)
    mockFollowRepo.isFollowing.mockResolvedValue(true as never)
    mockFollowRepo.unfollow.mockResolvedValue({} as never)

    const result = await followService.toggle("user-1", "user-2")
    expect(result).toEqual({ following: false })
    expect(mockFollowRepo.unfollow).toHaveBeenCalledWith("user-1", "user-2")
    expect(notificationRepo.create).not.toHaveBeenCalled()
  })

  it("follows and creates notification when not following", async () => {
    mockUserRepo.findById.mockResolvedValue({ id: "user-2" } as never)
    mockFollowRepo.isFollowing.mockResolvedValue(false as never)
    mockFollowRepo.follow.mockResolvedValue({} as never)

    const result = await followService.toggle("user-1", "user-2")
    expect(result).toEqual({ following: true })
    expect(mockFollowRepo.follow).toHaveBeenCalledWith("user-1", "user-2")
    expect(notificationRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-2",
      actorId: "user-1",
      type: "follow",
    }))
  })
})

// ── collectionService ────────────────────────────────────────────

describe("collectionService", () => {
  it("getById throws NotFound for missing collection", async () => {
    mockCollectionRepo.findById.mockResolvedValue(null)
    await expect(collectionService.getById("c1", "user-1")).rejects.toThrow(NotFoundError)
  })

  it("getById hides collection owned by another user", async () => {
    mockCollectionRepo.findById.mockResolvedValue({ id: "c1", userId: "user-2" } as never)
    await expect(collectionService.getById("c1", "user-1")).rejects.toThrow(NotFoundError)
  })

  it("getById returns own collection", async () => {
    const col = { id: "c1", userId: "user-1", name: "我的收藏" }
    mockCollectionRepo.findById.mockResolvedValue(col as never)
    const result = await collectionService.getById("c1", "user-1")
    expect(result).toEqual(col)
  })

  it("update rejects collection owned by another user", async () => {
    mockCollectionRepo.findById.mockResolvedValue({ id: "c1", userId: "user-2" } as never)
    await expect(collectionService.update("user-1", "c1", { name: "改名" })).rejects.toThrow(NotFoundError)
  })

  it("delete rejects collection owned by another user", async () => {
    mockCollectionRepo.findById.mockResolvedValue({ id: "c1", userId: "user-2" } as never)
    await expect(collectionService.delete("user-1", "c1")).rejects.toThrow(NotFoundError)
  })
})

// ── commentService ───────────────────────────────────────────────

describe("commentService", () => {
  it("delete rejects non-owner non-admin", async () => {
    mockCommentRepo.findById.mockResolvedValue({ id: "cmt-1", userId: "owner" } as never)
    await expect(commentService.delete("other-user", "cmt-1")).rejects.toThrow(NotFoundError)
  })

  it("delete allows owner", async () => {
    mockCommentRepo.findById.mockResolvedValue({ id: "cmt-1", userId: "owner" } as never)
    mockCommentRepo.delete.mockResolvedValue({} as never)
    await commentService.delete("owner", "cmt-1")
    expect(mockCommentRepo.delete).toHaveBeenCalledWith("cmt-1")
  })

  it("delete allows admin on any comment", async () => {
    mockCommentRepo.findById.mockResolvedValue({ id: "cmt-1", userId: "owner" } as never)
    mockCommentRepo.delete.mockResolvedValue({} as never)
    await commentService.delete("admin-1", "cmt-1", true)
    expect(mockCommentRepo.delete).toHaveBeenCalledWith("cmt-1")
  })

  it("toggleLike throws NotFound for missing comment", async () => {
    mockCommentRepo.findById.mockResolvedValue(null)
    await expect(commentService.toggleLike("user-1", "cmt-missing")).rejects.toThrow(NotFoundError)
  })

  it("toggleLike delegates to repo", async () => {
    mockCommentRepo.findById.mockResolvedValue({ id: "cmt-1", userId: "owner" } as never)
    mockCommentRepo.toggleLike.mockResolvedValue({ liked: true, count: 1 } as never)
    const result = await commentService.toggleLike("user-1", "cmt-1")
    expect(result).toEqual({ liked: true, count: 1 })
    expect(mockCommentRepo.toggleLike).toHaveBeenCalledWith("user-1", "cmt-1")
  })
})
