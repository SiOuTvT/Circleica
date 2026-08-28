/**
 * @jest-environment node
 */

jest.mock("@/repositories/forum", () => ({
  forumRepo: {
    findPostsPaginated: jest.fn(),
    findPostById: jest.fn(),
    incrementPostView: jest.fn(),
    createPost: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
    togglePostLike: jest.fn(),
    findComments: jest.fn(),
    findCommentById: jest.fn(),
    createComment: jest.fn(),
    deleteComment: jest.fn(),
    toggleCommentLike: jest.fn(),
  },
}))

jest.mock("@/repositories/user", () => ({
  userRepo: {},
  collectionRepo: {},
  notificationRepo: {
    create: jest.fn().mockResolvedValue({}),
  },
  followRepo: {},
  commentRepo: {},
  searchRepo: {},
  checkinRepo: {},
  profileRepo: {},
}))

import { forumService } from "@/services/forum"
import { forumRepo } from "@/repositories/forum"
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors"

const mockForumRepo = jest.mocked(forumRepo)

beforeEach(() => jest.clearAllMocks())

// ── createPost ──────────────────────────────────────────────────

describe("forumService.createPost", () => {
  const userId = "user-1"
  const validPost = { title: "Test Title", content: "Test content body" }

  it("creates a post with valid data", async () => {
    mockForumRepo.createPost.mockResolvedValue({ id: "post-1" } as never)
    const result = await forumService.createPost(userId, validPost)
    expect(mockForumRepo.createPost).toHaveBeenCalledWith(userId, {
      title: "Test Title",
      content: "Test content body",
      imageUrl: "",
      category: "discussion",
    })
    expect(result).toEqual({ id: "post-1" })
  })

  it("rejects empty title via Zod", async () => {
    await expect(forumService.createPost(userId, { title: "", content: "content" }))
      .rejects.toThrow()
  })

  it("rejects empty content via Zod", async () => {
    await expect(forumService.createPost(userId, { title: "title", content: "" }))
      .rejects.toThrow()
  })

  it("rejects title exceeding 200 characters", async () => {
    const longTitle = "a".repeat(201)
    await expect(forumService.createPost(userId, { title: longTitle, content: "content" }))
      .rejects.toThrow()
  })

  it("rejects content exceeding 10000 characters", async () => {
    const longContent = "a".repeat(10001)
    await expect(forumService.createPost(userId, { title: "title", content: longContent }))
      .rejects.toThrow()
  })

  it("accepts title at exactly 200 characters", async () => {
    mockForumRepo.createPost.mockResolvedValue({ id: "post-1" } as never)
    const title = "a".repeat(200)
    await forumService.createPost(userId, { title, content: "content" })
    expect(mockForumRepo.createPost).toHaveBeenCalled()
  })

  it("accepts content at exactly 10000 characters", async () => {
    mockForumRepo.createPost.mockResolvedValue({ id: "post-1" } as never)
    const content = "a".repeat(10000)
    await forumService.createPost(userId, { title: "title", content })
    expect(mockForumRepo.createPost).toHaveBeenCalled()
  })

  it("passes category through to repository", async () => {
    mockForumRepo.createPost.mockResolvedValue({ id: "post-1" } as never)
    await forumService.createPost(userId, { title: "t", content: "c", category: "question" })
    expect(mockForumRepo.createPost).toHaveBeenCalledWith(userId, expect.objectContaining({
      category: "question",
    }))
  })
})

// ── updatePost ──────────────────────────────────────────────────

describe("forumService.updatePost", () => {
  const userId = "user-1"
  const postId = "post-1"
  const existingPost = { id: postId, userId, title: "Old", content: "Old content" }

  it("updates title when valid", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)
    mockForumRepo.updatePost.mockResolvedValue({} as never)

    await forumService.updatePost(userId, postId, { title: "New Title" })
    expect(mockForumRepo.updatePost).toHaveBeenCalledWith(postId, { title: "New Title" })
  })

  it("updates content when valid", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)
    mockForumRepo.updatePost.mockResolvedValue({} as never)

    await forumService.updatePost(userId, postId, { content: "New Content" })
    expect(mockForumRepo.updatePost).toHaveBeenCalledWith(postId, { content: "New Content" })
  })

  it("rejects title exceeding 200 characters", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)
    const longTitle = "a".repeat(201)

    await expect(forumService.updatePost(userId, postId, { title: longTitle }))
      .rejects.toThrow(ValidationError)
  })

  it("rejects content exceeding 10000 characters", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)
    const longContent = "a".repeat(10001)

    await expect(forumService.updatePost(userId, postId, { content: longContent }))
      .rejects.toThrow(ValidationError)
  })

  it("rejects empty title", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)

    await expect(forumService.updatePost(userId, postId, { title: "" }))
      .rejects.toThrow(ValidationError)
    await expect(forumService.updatePost(userId, postId, { title: "   " }))
      .rejects.toThrow(ValidationError)
  })

  it("rejects empty content", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)

    await expect(forumService.updatePost(userId, postId, { content: "" }))
      .rejects.toThrow(ValidationError)
  })

  it("throws ForbiddenError when user is not the owner", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)

    await expect(forumService.updatePost("other-user", postId, { title: "New" }))
      .rejects.toThrow(ForbiddenError)
    await expect(forumService.updatePost("other-user", postId, { title: "New" }))
      .rejects.toThrow("只能编辑自己的帖子")
  })

  it("throws NotFoundError when post does not exist", async () => {
    mockForumRepo.findPostById.mockResolvedValue(null)

    await expect(forumService.updatePost(userId, "nonexistent", { title: "New" }))
      .rejects.toThrow(NotFoundError)
  })
})

// ── deletePost ──────────────────────────────────────────────────

describe("forumService.deletePost", () => {
  const userId = "user-1"
  const postId = "post-1"
  const existingPost = { id: postId, userId }

  it("allows owner to delete their own post", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)
    mockForumRepo.deletePost.mockResolvedValue({} as never)

    await forumService.deletePost(userId, postId)
    expect(mockForumRepo.deletePost).toHaveBeenCalledWith(postId)
  })

  it("rejects non-owner", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)

    await expect(forumService.deletePost("other-user", postId))
      .rejects.toThrow(ForbiddenError)
    await expect(forumService.deletePost("other-user", postId))
      .rejects.toThrow("只能删除自己的帖子")
  })

  it("allows admin to delete any post", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)
    mockForumRepo.deletePost.mockResolvedValue({} as never)

    await forumService.deletePost("admin-1", postId, true)
    expect(mockForumRepo.deletePost).toHaveBeenCalledWith(postId)
  })

  it("throws NotFoundError when post does not exist", async () => {
    mockForumRepo.findPostById.mockResolvedValue(null)

    await expect(forumService.deletePost(userId, "nonexistent"))
      .rejects.toThrow(NotFoundError)
  })
})

// ── createComment ───────────────────────────────────────────────

describe("forumService.createComment", () => {
  const userId = "user-1"
  const postId = "post-1"
  const existingPost = { id: postId, userId: "author-1" }

  it("creates a comment with valid content", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)
    mockForumRepo.createComment.mockResolvedValue({ id: "comment-1" } as never)

    const result = await forumService.createComment(userId, postId, { content: "Great post!" })
    expect(mockForumRepo.createComment).toHaveBeenCalledWith(postId, userId, "Great post!", undefined)
    expect(result).toEqual({ id: "comment-1" })
  })

  it("rejects empty content without image", async () => {
    await expect(forumService.createComment(userId, postId, { content: "" }))
      .rejects.toThrow()
    await expect(forumService.createComment(userId, postId, { content: "   " }))
      .rejects.toThrow("内容不能为空")
  })

  it("allows whitespace-only content when imageUrl is provided", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)
    mockForumRepo.createComment.mockResolvedValue({ id: "c1" } as never)

    // " " passes Zod min(1) check, trims to "", then manual check allows it with imageUrl
    await forumService.createComment(userId, postId, { content: " " }, "https://img.png")
    expect(mockForumRepo.createComment).toHaveBeenCalledWith(postId, userId, "", "https://img.png")
  })

  it("rejects content exceeding 2000 characters", async () => {
    const longContent = "a".repeat(2001)
    await expect(forumService.createComment(userId, postId, { content: longContent }))
      .rejects.toThrow("评论最多 2000 个字符")
  })

  it("throws NotFoundError when post does not exist", async () => {
    mockForumRepo.findPostById.mockResolvedValue(null)

    await expect(forumService.createComment(userId, "nonexistent", { content: "hi" }))
      .rejects.toThrow(NotFoundError)
  })

  it("trims whitespace from content", async () => {
    mockForumRepo.findPostById.mockResolvedValue(existingPost as never)
    mockForumRepo.createComment.mockResolvedValue({ id: "c1" } as never)

    await forumService.createComment(userId, postId, { content: "  hello  " })
    expect(mockForumRepo.createComment).toHaveBeenCalledWith(postId, userId, "hello", undefined)
  })
})
