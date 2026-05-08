import { badRequest, created, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { withRateLimit } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
import { rateLimits } from "@/lib/rate-limit"
import { sanitizeString } from "@/lib/sanitize"
import { NextRequest } from "next/server"

async function handleComment(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id: gameId } = await context.params

  const formData = await req.formData()
  const content = sanitizeString((formData.get("content") as string)?.trim())
  const image = formData.get("image") as File | null

  if (!content) return badRequest("内容不能为空")

  let imageUrl: string | null = null

  // 处理图片上传（如果提供了图片）
  if (image && image.size > 0) {
    // 验证文件类型和大小
    if (!image.type.startsWith("image/")) {
      return badRequest("只支持图片文件")
    }
    if (image.size > 5 * 1024 * 1024) {
      return badRequest("图片大小不能超过 5MB")
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
      content,
      imageUrl: imageUrl || "",
    },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  })

  return created({ ...comment, createdAt: comment.createdAt.toISOString() })
}

export const POST = (req: NextRequest, context: { params: Promise<{ id: string }> }) =>
  withRateLimit(
    (r) => handleComment(r, context),
    rateLimits.comment,
    "comment"
  )(req)
