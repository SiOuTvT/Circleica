/**
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
  collectionRepo: {},
  notificationRepo: { create: jest.fn() },
  followRepo: {},
  commentRepo: {},
  searchRepo: {},
  checkinRepo: {},
  profileRepo: {},
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    siteSetting: {
      findUnique: jest.fn(),
    },
    emailVerificationToken: {
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2b$12$hashedpassword"),
  compare: jest.fn(),
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
    system: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    },
    db: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
  },
}))

import { authService } from "@/services/user"
import { userRepo } from "@/repositories/user"
import { prisma } from "@/lib/prisma"
import { ValidationError, ConflictError } from "@/lib/errors"

const mockUserRepo = jest.mocked(userRepo)
const mockPrisma = jest.mocked(prisma)

beforeEach(() => {
  jest.clearAllMocks()
  // Default: no existing user, registration enabled, no email verification needed
  mockUserRepo.findByUsername.mockResolvedValue(null)
  mockUserRepo.findByEmail.mockResolvedValue(null)
  mockPrisma.user.count.mockResolvedValue(1) // not first user
  mockPrisma.siteSetting.findUnique.mockResolvedValue(null) // no special settings
})

// ── register ────────────────────────────────────────────────────

describe("authService.register", () => {
  const validInput = {
    username: "testuser",
    email: "test@example.com",
    password: "password123",
  }

  it("registers a user with valid input", async () => {
    const createdUser = { id: "user-1", username: "testuser", email: "test@example.com", role: "USER" }
    mockUserRepo.create.mockResolvedValue(createdUser as never)

    const result = await authService.register(validInput)
    expect(result.username).toBe("testuser")
    expect(mockUserRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      username: "testuser",
      email: "test@example.com",
      password: "$2b$12$hashedpassword",
      role: "USER",
    }))
  })

  it("normalizes email to lowercase", async () => {
    mockUserRepo.create.mockResolvedValue({ id: "u1" } as never)
    await authService.register({ ...validInput, email: "TEST@EXAMPLE.COM" })
    expect(mockUserRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      email: "test@example.com",
    }))
  })

  // ── Username validation ──

  it("rejects username shorter than 3 characters", async () => {
    await expect(authService.register({ ...validInput, username: "ab" }))
      .rejects.toThrow(ValidationError)
    await expect(authService.register({ ...validInput, username: "ab" }))
      .rejects.toThrow("用户名 3-20 个字符")
  })

  it("rejects username longer than 20 characters", async () => {
    await expect(authService.register({ ...validInput, username: "a".repeat(21) }))
      .rejects.toThrow(ValidationError)
  })

  it("rejects username with special characters", async () => {
    await expect(authService.register({ ...validInput, username: "user@name" }))
      .rejects.toThrow(ValidationError)
    await expect(authService.register({ ...validInput, username: "user@name" }))
      .rejects.toThrow("用户名只能包含字母、数字和下划线")
  })

  it("accepts username with underscores", async () => {
    mockUserRepo.create.mockResolvedValue({ id: "u1" } as never)
    await authService.register({ ...validInput, username: "test_user_123" })
    expect(mockUserRepo.create).toHaveBeenCalled()
  })

  // ── Email validation ──

  it("rejects email without @", async () => {
    await expect(authService.register({ ...validInput, email: "invalid" }))
      .rejects.toThrow(ValidationError)
    await expect(authService.register({ ...validInput, email: "invalid" }))
      .rejects.toThrow("邮箱格式不正确")
  })

  it("rejects empty email", async () => {
    await expect(authService.register({ ...validInput, email: "" }))
      .rejects.toThrow(ValidationError)
  })

  // ── Password validation ──

  it("rejects password shorter than 8 characters", async () => {
    await expect(authService.register({ ...validInput, password: "1234567" }))
      .rejects.toThrow(ValidationError)
    await expect(authService.register({ ...validInput, password: "1234567" }))
      .rejects.toThrow("密码至少 8 位")
  })

  it("rejects empty password", async () => {
    await expect(authService.register({ ...validInput, password: "" }))
      .rejects.toThrow(ValidationError)
  })

  // ── Duplicate checks ──

  it("rejects duplicate username", async () => {
    mockUserRepo.findByUsername.mockResolvedValue({ id: "existing" })

    await expect(authService.register(validInput))
      .rejects.toThrow(ConflictError)
    await expect(authService.register(validInput))
      .rejects.toThrow("用户名已被注册")
  })

  it("rejects duplicate email", async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: "existing" })

    await expect(authService.register(validInput))
      .rejects.toThrow(ConflictError)
    await expect(authService.register(validInput))
      .rejects.toThrow("邮箱已被注册")
  })

  it("checks username before email", async () => {
    mockUserRepo.findByUsername.mockResolvedValue({ id: "existing" })

    await expect(authService.register(validInput))
      .rejects.toThrow("用户名已被注册")
    expect(mockUserRepo.findByEmail).not.toHaveBeenCalled()
  })

  // ── First user ──

  it("makes the first user a SUPER_ADMIN", async () => {
    mockPrisma.user.count.mockResolvedValue(0)
    mockUserRepo.create.mockResolvedValue({ id: "u1", role: "SUPER_ADMIN" } as never)

    await authService.register(validInput)
    expect(mockUserRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      role: "SUPER_ADMIN",
      emailVerified: true,
    }))
  })

  it("makes subsequent users USER role", async () => {
    mockPrisma.user.count.mockResolvedValue(5)
    mockUserRepo.create.mockResolvedValue({ id: "u1", role: "USER" } as never)

    await authService.register(validInput)
    expect(mockUserRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      role: "USER",
      emailVerified: false,
    }))
  })
})
