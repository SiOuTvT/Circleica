import { withHandler, json, created } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { forumService } from "@/services/forum"
import { getStorage } from "@/lib/storage"
import { UPLOAD } from "@/lib/config"
import { ValidationError } from "@/lib/errors"

export const GET = withHandler(async (req, ctx) => {
  const { id } = await ctx!.params
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const data = await forumService.getComments(id, page)
  return json(data)
})

export const POST = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params

  const fd = await req.formData()
  const content = (fd.get("content") as string)?.trim() || ""
  const imageFile = fd.get("image") as File | null

  let imageUrl: string | undefined
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 5 * 1024 * 1024) {
      throw new ValidationError("图片太大啦，最多 5MB 哦")
    }
    if (!UPLOAD.IMAGE_TYPES.includes(imageFile.type)) {
      throw new ValidationError("只支持 JPEG、PNG、GIF、WebP 格式的图片")
    }
    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const ext = imageFile.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg"
    const storage = getStorage()
    const result = await storage.upload(buffer, "forum-comments", ext)
    imageUrl = result.url
  }

  const comment = await forumService.createComment(userId, id, { content }, imageUrl)
  return created(comment)
})
