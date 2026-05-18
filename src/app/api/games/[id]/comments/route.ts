import { badRequest, created, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { withRateLimit } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
import { rateLimits } from "@/lib/rate-limit"
import { sanitizeString } from "@/lib/sanitize"
import { NextRequest } from "next/server"
import sharp from "sharp"

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
    if (image.size > 1 * 1024 * 1024) {
      return badRequest("图片大小不能超过 1MB")
    }

    // 用 sharp 压缩后转 base64 存储（临时方案，后续改用 R2）
    const rawBytes = await image.arrayBuffer()
    const rawBuffer = Buffer.from(rawBytes)

    // 校验魔术字节，防止伪装文件
    const header = rawBuffer.slice(0, 4)
    const isImage =
      (header[0] === 0xff && header[1] === 0xd8) || // JPEG
      (header[0] === 0x89 && header[1] === 0x50) || // PNG
      (header[0] === 0x47 && header[1] === 0x49) || // GIF
      (header[0] === 0x52 && header[1] === 0x49)    // WEBP (RIFF)
    if (!isImage) {
      return badRequest("不是有效的图片文件")
    }

    const compressed = await sharp(rawBuffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer()

    imageUrl = `data:image/jpeg;base64,${compressed.toString("base64")}`
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
