import { checkAchievements, invalidateUserStats } from "@/lib/achievements"
import { badRequest, created, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { withRateLimit } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
import { rateLimits } from "@/lib/rate-limit"
import { sanitizeString } from "@/lib/sanitize"
import crypto from "crypto"
import { mkdir, writeFile } from "fs/promises"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import sharp from "sharp"

async function handleComment(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id: gameId } = await context.params

  const formData = await req.formData()
  const content = sanitizeString((formData.get("content") as string)?.trim())
  const image = formData.get("image") as File | null
  const replyToId = (formData.get("replyToId") as string)?.trim() || undefined

  if (!content) return badRequest("内容不能为空")

  // Verify parent exists if replying
  if (replyToId) {
    const parent = await prisma.comment.findUnique({ where: { id: replyToId }, select: { gameId: true } })
    if (!parent || parent.gameId !== gameId) return badRequest("回复的评论不存在")
  }

  let imageUrl: string | null = null

  // 处理图片上传
  if (image && image.size > 0) {
    if (!image.type.startsWith("image/")) {
      return badRequest("只支持图片文件")
    }
    if (image.size > 1 * 1024 * 1024) {
      return badRequest("图片大小不能超过 1MB")
    }

    const rawBytes = await image.arrayBuffer()
    const rawBuffer = Buffer.from(rawBytes)

    const header = rawBuffer.slice(0, 4)
    const isImage =
      (header[0] === 0xff && header[1] === 0xd8) ||
      (header[0] === 0x89 && header[1] === 0x50) ||
      (header[0] === 0x47 && header[1] === 0x49) ||
      (header[0] === 0x52 && header[1] === 0x49)
    if (!isImage) {
      return badRequest("不是有效的图片文件")
    }

    const compressed = await sharp(rawBuffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer()

    const uploadDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })
    const filename = `comment-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.jpg`
    await writeFile(path.join(uploadDir, filename), compressed)
    imageUrl = `/uploads/${filename}`
  }

  const comment = await prisma.comment.create({
    data: {
      gameId,
      userId: session.user.id,
      content,
      imageUrl: imageUrl || "",
      parentId: replyToId || null,
    },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  })

  invalidateUserStats(session.user.id).catch(() => {})
  checkAchievements(session.user.id).catch(() => {})

  return created({ ...comment, createdAt: comment.createdAt.toISOString() })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params
  const url = req.nextUrl
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10")))
  const sort = url.searchParams.get("sort") === "hot" ? "hot" : "newest"
  const skip = (page - 1) * limit

  const [topLevelComments, total] = await Promise.all([
    prisma.comment.findMany({
      where: { gameId, parentId: null },
      orderBy: sort === "hot" ? { likeCount: "desc" } : { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        content: true,
        imageUrl: true,
        likeCount: true,
        createdAt: true,
        user: { select: { id: true, username: true, avatar: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            imageUrl: true,
            likeCount: true,
            createdAt: true,
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    }),
    prisma.comment.count({ where: { gameId, parentId: null } }),
  ])

  return NextResponse.json({
    comments: topLevelComments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      replies: c.replies.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    })),
    total,
    page,
    limit,
  })
}

export const POST = (req: NextRequest, context: { params: Promise<{ id: string }> }) =>
  withRateLimit(
    (r) => handleComment(r, context),
    rateLimits.comment,
    "comment"
  )(req)
