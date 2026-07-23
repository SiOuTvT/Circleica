/**
 * @jest-environment node
 */

jest.mock("@/repositories/game", () => ({
  gameRepo: {
    findPaginated: jest.fn(),
    findById: jest.fn(),
    findBySerialId: jest.fn(),
    findRandom: jest.fn(),
    incrementViewCount: jest.fn(),
    batchIncrementViewCount: jest.fn(),
    isFavorited: jest.fn(),
    toggleFavorite: jest.fn(),
    getPlayStatus: jest.fn(),
    setPlayStatus: jest.fn(),
    getRating: jest.fn(),
    setRating: jest.fn(),
    getRatingStats: jest.fn(),
    findComments: jest.fn(),
    createComment: jest.fn(),
    report: jest.fn(),
    findResources: jest.fn(),
    createResource: jest.fn(),
    deleteResource: jest.fn(),
    reportResource: jest.fn(),
  },
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    gameResource: {
      findUnique: jest.fn(),
    },
  },
}))

import { gameService } from "@/services/game"
import { gameRepo } from "@/repositories/game"
import { prisma } from "@/lib/prisma"
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors"

const mockGameRepo = jest.mocked(gameRepo)
const mockPrisma = jest.mocked(prisma)

beforeEach(() => jest.clearAllMocks())

// ── setPlayStatus ───────────────────────────────────────────────

describe("gameService.setPlayStatus", () => {
  const userId = "user-1"
  const gameId = "game-1"

  it.each([
    ["想玩", "WANT_TO_PLAY"],
    ["在玩", "PLAYING"],
    ["玩过", "PLAYED"],
    ["搁置", "ON_HOLD"],
    ["弃坑", "DROPPED"],
  ])("accepts Chinese status '%s' and maps to '%s'", async (input, expected) => {
    mockGameRepo.setPlayStatus.mockResolvedValue({} as never)
    await gameService.setPlayStatus(userId, gameId, input)
    expect(mockGameRepo.setPlayStatus).toHaveBeenCalledWith(userId, gameId, expected)
  })

  it("accepts valid enum values directly", async () => {
    mockGameRepo.setPlayStatus.mockResolvedValue({} as never)
    await gameService.setPlayStatus(userId, gameId, "PLAYING")
    expect(mockGameRepo.setPlayStatus).toHaveBeenCalledWith(userId, gameId, "PLAYING")
  })

  it("rejects invalid status values", async () => {
    await expect(gameService.setPlayStatus(userId, gameId, "INVALID"))
      .rejects.toThrow(ValidationError)
    await expect(gameService.setPlayStatus(userId, gameId, "INVALID"))
      .rejects.toThrow("无效的游玩状态")
  })

  it("rejects empty string", async () => {
    await expect(gameService.setPlayStatus(userId, gameId, ""))
      .rejects.toThrow(ValidationError)
  })
})

// ── setRating ───────────────────────────────────────────────────

describe("gameService.setRating", () => {
  const userId = "user-1"
  const gameId = "game-1"

  it.each([1, 2, 3, 4, 5])("accepts valid score %i", async (score) => {
    mockGameRepo.setRating.mockResolvedValue({} as never)
    mockGameRepo.getRatingStats.mockResolvedValue({
      _avg: { score }, _count: { score: 1 },
    } as never)
    await gameService.setRating(userId, gameId, score)
    expect(mockGameRepo.setRating).toHaveBeenCalledWith(userId, gameId, score)
  })

  it("rejects score less than 1", async () => {
    await expect(gameService.setRating(userId, gameId, 0))
      .rejects.toThrow(ValidationError)
    await expect(gameService.setRating(userId, gameId, -1))
      .rejects.toThrow(ValidationError)
  })

  it("rejects score greater than 5", async () => {
    await expect(gameService.setRating(userId, gameId, 6))
      .rejects.toThrow(ValidationError)
    await expect(gameService.setRating(userId, gameId, 100))
      .rejects.toThrow(ValidationError)
  })

  it("rejects non-integer scores", async () => {
    await expect(gameService.setRating(userId, gameId, 3.5))
      .rejects.toThrow(ValidationError)
    await expect(gameService.setRating(userId, gameId, NaN))
      .rejects.toThrow(ValidationError)
  })

  it("returns rating stats after setting", async () => {
    const stats = { _avg: { score: 4 }, _count: { score: 10 } }
    mockGameRepo.setRating.mockResolvedValue({} as never)
    mockGameRepo.getRatingStats.mockResolvedValue(stats as never)

    const result = await gameService.setRating(userId, gameId, 4)
    expect(result).toEqual(stats)
    expect(mockGameRepo.getRatingStats).toHaveBeenCalledWith(gameId)
  })
})

// ── createComment ───────────────────────────────────────────────

describe("gameService.createComment", () => {
  const userId = "user-1"
  const gameId = "game-1"

  it("rejects empty content without image", async () => {
    await expect(gameService.createComment(userId, gameId, ""))
      .rejects.toThrow("评论内容不能为空")
    await expect(gameService.createComment(userId, gameId, "   "))
      .rejects.toThrow("评论内容不能为空")
  })

  it("allows empty content when imageUrl is provided", async () => {
    mockGameRepo.createComment.mockResolvedValue({} as never)
    await gameService.createComment(userId, gameId, "", "https://example.com/img.png")
    expect(mockGameRepo.createComment).toHaveBeenCalledWith(
      userId, gameId, "", "https://example.com/img.png", undefined
    )
  })

  it("rejects content exceeding 2000 characters", async () => {
    const longContent = "a".repeat(2001)
    await expect(gameService.createComment(userId, gameId, longContent))
      .rejects.toThrow("评论最多 2000 个字符")
  })

  it("accepts content at exactly 2000 characters", async () => {
    mockGameRepo.createComment.mockResolvedValue({} as never)
    const content = "a".repeat(2000)
    await gameService.createComment(userId, gameId, content)
    expect(mockGameRepo.createComment).toHaveBeenCalled()
  })

  it("trims whitespace from content before saving", async () => {
    mockGameRepo.createComment.mockResolvedValue({} as never)
    await gameService.createComment(userId, gameId, "  hello  ")
    expect(mockGameRepo.createComment).toHaveBeenCalledWith(
      userId, gameId, "hello", undefined, undefined
    )
  })
})

// ── toggleFavorite ──────────────────────────────────────────────

describe("gameService.toggleFavorite", () => {
  const userId = "user-1"
  const gameId = "game-1"

  it("adds favorite when not already favorited", async () => {
    mockGameRepo.findById.mockResolvedValue({ id: gameId } as never)
    mockGameRepo.toggleFavorite.mockResolvedValue(true)

    const result = await gameService.toggleFavorite(userId, gameId)
    expect(result).toEqual({ favorited: true })
    expect(mockGameRepo.toggleFavorite).toHaveBeenCalledWith(userId, gameId, undefined)
  })

  it("removes favorite when already favorited", async () => {
    mockGameRepo.findById.mockResolvedValue({ id: gameId } as never)
    mockGameRepo.toggleFavorite.mockResolvedValue(false)

    const result = await gameService.toggleFavorite(userId, gameId)
    expect(result).toEqual({ favorited: false })
    expect(mockGameRepo.toggleFavorite).toHaveBeenCalledWith(userId, gameId, undefined)
  })

  it("throws NotFoundError when game does not exist", async () => {
    mockGameRepo.findById.mockResolvedValue(null)
    await expect(gameService.toggleFavorite(userId, "nonexistent"))
      .rejects.toThrow(NotFoundError)
  })
})

// ── deleteResource ──────────────────────────────────────────────

describe("gameService.deleteResource", () => {
  const resourceId = "res-1"

  it("allows owner to delete their own resource", async () => {
    mockPrisma.gameResource.findUnique.mockResolvedValue({ userId: "owner-1" } as never)
    mockGameRepo.deleteResource.mockResolvedValue({} as never)

    await gameService.deleteResource(resourceId, "owner-1", "USER")
    expect(mockGameRepo.deleteResource).toHaveBeenCalledWith(resourceId)
  })

  it("rejects non-owner with non-admin role", async () => {
    mockPrisma.gameResource.findUnique.mockResolvedValue({ userId: "owner-1" } as never)

    await expect(gameService.deleteResource(resourceId, "other-user", "USER"))
      .rejects.toThrow(ForbiddenError)
    await expect(gameService.deleteResource(resourceId, "other-user", "USER"))
      .rejects.toThrow("只能删除自己上传的资源")
  })

  it("allows ADMIN to delete any resource", async () => {
    mockPrisma.gameResource.findUnique.mockResolvedValue({ userId: "owner-1" } as never)
    mockGameRepo.deleteResource.mockResolvedValue({} as never)

    await gameService.deleteResource(resourceId, "admin-1", "ADMIN")
    expect(mockGameRepo.deleteResource).toHaveBeenCalledWith(resourceId)
  })

  it("allows SUPER_ADMIN to delete any resource", async () => {
    mockPrisma.gameResource.findUnique.mockResolvedValue({ userId: "owner-1" } as never)
    mockGameRepo.deleteResource.mockResolvedValue({} as never)

    await gameService.deleteResource(resourceId, "super-admin-1", "SUPER_ADMIN")
    expect(mockGameRepo.deleteResource).toHaveBeenCalledWith(resourceId)
  })

  it("throws NotFoundError when resource does not exist", async () => {
    mockPrisma.gameResource.findUnique.mockResolvedValue(null)

    await expect(gameService.deleteResource("nonexistent", "user-1", "USER"))
      .rejects.toThrow(NotFoundError)
  })
})
