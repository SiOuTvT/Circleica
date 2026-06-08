import { checkAchievements } from "@/lib/achievements"
import { auth } from "@/lib/auth"
import { withRateLimit } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
import { rateLimits } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

/**
 * 简单的 HTML 转义函数，防止 XSS 攻击
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")))
  const skip = (page - 1) * limit

  const [posts, total] = await Promise.all([
    prisma.forumPost.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.forumPost.count(),
  ])

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      imageUrl: p.imageUrl,
      likeCount: p.likeCount,
      isSolved: p.isSolved,
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
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const fd = await req.formData()
  const title = (fd.get("title") as string)?.trim()
  const content = (fd.get("content") as string)?.trim()
  if (!title || !content) return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 })

  // 限制长度
  if (title.length > 100) return NextResponse.json({ error: "标题不能超过100字" }, { status: 400 })
  if (content.length > 5000) return NextResponse.json({ error: "内容不能超过5000字" }, { status: 400 })

  // XSS 防护：转义 HTML
  const sanitizedTitle = escapeHtml(title)
  const sanitizedContent = escapeHtml(content)

  const post = await prisma.forumPost.create({
    data: { userId: session.user.id, title: sanitizedTitle, content: sanitizedContent },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      _count: { select: { comments: true } },
    },
  })

  // 异步检查成就解锁（不阻塞响应）
  checkAchievements(session.user.id).catch(() => {})

  return NextResponse.json({
    id: post.id, title: post.title, content: post.content,
    imageUrl: post.imageUrl, likeCount: post.likeCount,
    createdAt: post.createdAt.toISOString(),
    user: post.user, commentCount: 0,
  }, { status: 201 })
}

export const POST = (req: NextRequest) =>
  withRateLimit(handleCreatePost, rateLimits.comment, "forum-post")(req)
