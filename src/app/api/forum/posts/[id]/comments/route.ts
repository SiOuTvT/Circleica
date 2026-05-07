import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 速率限制：每分钟最多10条评论
  const rateLimit = await checkRateLimit(RATE_LIMITS.comment)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.reset),
        },
      }
    )
  }

  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id: postId } = await params

  const fd = await req.formData()
  const content = (fd.get("content") as string)?.trim()
  if (!content) return NextResponse.json({ error: "内容不能为空" }, { status: 400 })

  const comment = await prisma.forumComment.create({
    data: { postId, userId: session.user.id, content },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  })

  return NextResponse.json({ ...comment, createdAt: comment.createdAt.toISOString() }, { 
    status: 201,
    headers: {
      "X-RateLimit-Limit": String(rateLimit.limit),
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": String(rateLimit.reset),
    },
  })
}
