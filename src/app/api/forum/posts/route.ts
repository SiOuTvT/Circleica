import { checkAchievements, invalidateUserStats } from "@/lib/achievements"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { withRateLimit } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
import { rateLimits } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")))
  const skip = (page - 1) * limit
  const category = searchParams.get("category") || ""
  const sort = searchParams.get("sort") || "latest"
  const search = searchParams.get("search") || ""

  const where: Record<string, unknown> = {}
  if (category) where.category = category
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ]
  }

  let orderBy: Record<string, string> = { createdAt: "desc" }
  if (sort === "hot") orderBy = { likeCount: "desc" }
  else if (sort === "active") orderBy = { updatedAt: "desc" }

  const [posts, total] = await Promise.all([
    prisma.forumPost.findMany({
      where,
      orderBy: [orderBy, { createdAt: "desc" } as const],
      skip,
      take: limit,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.forumPost.count({ where }),
  ])

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      imageUrl: p.imageUrl,
      likeCount: p.likeCount,
      isSolved: p.isSolved,
      isPinned: p.isPinned,
      isLocked: p.isLocked,
      category: p.category,
      viewCount: p.viewCount,
      updatedAt: p.updatedAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      user: p.user,
      commentCount: p._count.comments,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}

async function handleCreatePost(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

    const fd = await req.formData()
    const title = (fd.get("title") as string)?.trim()
    const content = (fd.get("content") as string)?.trim()
    const category = (fd.get("category") as string)?.trim() || "discussion"
    if (!title || !content) return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 })

    // Validate category
    const validCategories = ["discussion", "help", "resource", "offtopic"]
    if (!validCategories.includes(category)) return NextResponse.json({ error: "无效的分类" }, { status: 400 })

    if (title.length > 100) return NextResponse.json({ error: "标题不能超过100字" }, { status: 400 })
    if (content.length > 5000) return NextResponse.json({ error: "内容不能超过5000字" }, { status: 400 })

    const post = await prisma.forumPost.create({
      data: { userId: session.user.id, title, content, category },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { comments: true } },
      },
    })

    invalidateUserStats(session.user.id).catch(() => {})
    checkAchievements(session.user.id).catch(() => {})

    return NextResponse.json({
      id: post.id, title: post.title, content: post.content,
      imageUrl: post.imageUrl, likeCount: post.likeCount,
      category: post.category, isPinned: post.isPinned, isLocked: post.isLocked,
      viewCount: post.viewCount, updatedAt: post.updatedAt.toISOString(),
      createdAt: post.createdAt.toISOString(),
      user: post.user, commentCount: 0,
    }, { status: 201 })
  } catch (error) {
    logger.forum.error("[Forum Post Create]", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}

export const POST = (req: NextRequest) =>
  withRateLimit(handleCreatePost, rateLimits.comment, "forum-post")(req)
