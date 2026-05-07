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
  const { id: gameId } = await params

  const formData = await req.formData()
  const content = (formData.get("content") as string)?.trim()
  const image = formData.get("image") as File | null

  if (!content?.trim()) return NextResponse.json({ error: "内容不能为空" }, { status: 400 })

  let imageUrl: string | null = null

  // 处理图片上传（如果提供了图片）
  if (image && image.size > 0) {
    // 验证文件类型和大小
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "只支持图片文件" }, { status: 400 })
    }
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "图片大小不能超过 5MB" }, { status: 400 })
    }

    // 将图片转换为 base64 存储
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    imageUrl = `data:${image.type};base64,${buffer.toString("base64")}`
  }

  const comment = await prisma.comment.create({
    data: { 
      gameId, 
      userId: session.user.id, 
      content: content.trim(),
      imageUrl: imageUrl || "",  // 修复：使用正确的字段名 imageUrl
    },
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
