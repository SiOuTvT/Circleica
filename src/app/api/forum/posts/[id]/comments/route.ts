import { badRequest, created, tooManyRequests, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { uploadToR2 } from "@/lib/r2"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { sanitizeString } from "@/lib/sanitize"
import { NextRequest } from "next/server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 速率限制：每分钟最多10条评论
  const rateLimit = await checkRateLimit(rateLimits.comment)
  if (!rateLimit.success) {
    return tooManyRequests("请求过于频繁，请稍后再试")
  }

  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id: postId } = await params

  const fd = await req.formData()
  const content = sanitizeString((fd.get("content") as string)?.trim())
  const imageFile = fd.get("image") as File | null

  if (!content && !imageFile) return badRequest("内容不能为空")

  // 内容长度限制
  if (content && content.length > 2000) {
    return badRequest("评论内容不能超过2000字")
  }

  // 处理图片上传
  let imageUrl = ""
  if (imageFile && imageFile.size > 0) {
    // 限制图片大小 5MB
    if (imageFile.size > 5 * 1024 * 1024) {
      return badRequest("图片太大啦，最多 5MB 哦")
    }
    // 验证文件类型
    if (!imageFile.type.startsWith("image/")) {
      return badRequest("只能上传图片文件")
    }
    try {
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const ext = imageFile.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg"
      const result = await uploadToR2(buffer, "forum-comments", ext)
      imageUrl = result.url
    } catch (error) {
      console.error("[Forum Comment] Image upload failed:", error)
      return badRequest("图片上传失败，请稍后再试")
    }
  }

  // 获取帖子作者 ID
  const post = await prisma.forumPost.findUnique({
    where: { id: postId },
    select: { userId: true },
  })

  const comment = await prisma.forumComment.create({
    data: {
      postId,
      userId: session.user.id,
      content: content || "",
      imageUrl,
    },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  })

  // 通知帖子作者有新评论
  if (post) {
    createNotification({
      userId: post.userId,
      actorId: session.user.id,
      type: "forum_comment_new",
      targetType: "forum_post",
      targetId: postId,
    }).catch(() => {})
  }

  return created({ ...comment, createdAt: comment.createdAt.toISOString() })
}
