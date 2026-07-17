/**
 * Zod Schema 验证测试
 * @jest-environment node
 */
import {
  registerSchema,
  loginSchema,
  gameCommentSchema,
  forumPostSchema,
  forumCommentSchema,
  gameCreateSchema,
  gameResourceCreateSchema,
  collectionCreateSchema,
  announcementSchema,
  paginationSchema,
} from "@/lib/validations"

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const result = registerSchema.safeParse({
      username: "test_user",
      email: "test@example.com",
      password: "password123",
    })
    expect(result.success).toBe(true)
  })

  it("rejects short username", () => {
    const result = registerSchema.safeParse({
      username: "ab",
      email: "test@example.com",
      password: "password123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      email: "not-an-email",
      password: "password123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      email: "test@example.com",
      password: "1234567",
    })
    expect(result.success).toBe(false)
  })

  it("rejects special chars in username", () => {
    const result = registerSchema.safeParse({
      username: "test user!",
      email: "test@example.com",
      password: "password123",
    })
    expect(result.success).toBe(false)
  })
})

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({ identifier: "testuser", password: "pass123" })
    expect(result.success).toBe(true)
  })

  it("rejects empty identifier", () => {
    const result = loginSchema.safeParse({ identifier: "", password: "pass123" })
    expect(result.success).toBe(false)
  })
})

describe("gameCommentSchema", () => {
  it("accepts valid comment", () => {
    const result = gameCommentSchema.safeParse({ content: "好游戏！" })
    expect(result.success).toBe(true)
  })

  it("accepts comment with rating", () => {
    const result = gameCommentSchema.safeParse({ content: "好玩", rating: 4 })
    expect(result.success).toBe(true)
  })

  it("rejects rating > 5", () => {
    const result = gameCommentSchema.safeParse({ content: "ok", rating: 6 })
    expect(result.success).toBe(false)
  })

  it("rejects rating < 1", () => {
    const result = gameCommentSchema.safeParse({ content: "ok", rating: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects empty content without image", () => {
    const result = gameCommentSchema.safeParse({ content: "" })
    expect(result.success).toBe(false)
  })
})

describe("forumPostSchema", () => {
  it("accepts valid post", () => {
    const result = forumPostSchema.safeParse({
      title: "测试帖子",
      content: "帖子内容",
      category: "discussion",
    })
    expect(result.success).toBe(true)
  })

  it("accepts post without category (defaults)", () => {
    const result = forumPostSchema.safeParse({
      title: "测试",
      content: "内容",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid category", () => {
    const result = forumPostSchema.safeParse({
      title: "测试",
      content: "内容",
      category: "invalid_category",
    })
    expect(result.success).toBe(false)
  })

  it("rejects title > 200 chars", () => {
    const result = forumPostSchema.safeParse({
      title: "a".repeat(201),
      content: "内容",
    })
    expect(result.success).toBe(false)
  })
})

describe("gameResourceCreateSchema", () => {
  it("accepts valid resource", () => {
    const result = gameResourceCreateSchema.safeParse({
      platform: ["PC"],
      language: ["中文"],
      entries: [{ url: "https://example.com/file.zip" }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty entries", () => {
    const result = gameResourceCreateSchema.safeParse({
      entries: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid URL", () => {
    const result = gameResourceCreateSchema.safeParse({
      entries: [{ url: "not-a-url" }],
    })
    expect(result.success).toBe(false)
  })
})

describe("collectionCreateSchema", () => {
  it("accepts valid collection", () => {
    const result = collectionCreateSchema.safeParse({ name: "我的收藏" })
    expect(result.success).toBe(true)
  })

  it("rejects empty name", () => {
    const result = collectionCreateSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects name > 50 chars", () => {
    const result = collectionCreateSchema.safeParse({ name: "a".repeat(51) })
    expect(result.success).toBe(false)
  })
})

describe("gameCreateSchema", () => {
  it("accepts valid game", () => {
    const result = gameCreateSchema.safeParse({
      title: "游戏标题",
      description: "游戏描述",
      coverImage: "https://example.com/cover.jpg",
    })
    expect(result.success).toBe(true)
  })

  it("does NOT accept old fields (downloadUrl, engine)", () => {
    const result = gameCreateSchema.safeParse({
      title: "游戏",
      downloadUrl: "https://example.com",
      engine: "KiriKiri",
    })
    if (result.success) {
      // These fields should be stripped/ignored
      expect(result.data).not.toHaveProperty("downloadUrl")
      expect(result.data).not.toHaveProperty("engine")
    }
  })
})

describe("paginationSchema", () => {
  it("defaults page=1, limit=20", () => {
    const result = paginationSchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it("rejects limit > 100", () => {
    const result = paginationSchema.safeParse({ limit: 101 })
    expect(result.success).toBe(false)
  })

  it("coerces string to number", () => {
    const result = paginationSchema.parse({ page: "3", limit: "50" })
    expect(result.page).toBe(3)
    expect(result.limit).toBe(50)
  })
})
