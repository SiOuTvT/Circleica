import { withHandler, json, created, safeParseJson } from '@/lib/api-handler'
import { requireAuth, getOptionalAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { RateLimitError, ValidationError } from '@/lib/errors'
import { revalidateTag } from 'next/cache'
import { CacheTag, gameTag } from '@/lib/cache-tags'
import { resolveGameCuid } from '@/lib/serial-id'

export const GET = withHandler(async (req, ctx) => {
  await getOptionalAuth()
  const { id } = await ctx!.params
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '10')))

  // [id] 两种都接：数字 serialId 与 cuid，与页面路由 /games/[id] 的解析口径一致
  const gameCuid = await resolveGameCuid(id)
  if (!gameCuid) return json({ items: [], total: 0, page, limit })

  const result = await gameService.getComments(gameCuid, page, limit)
  return json(result)
})

export const POST = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.comment, "game-comment")
  if (!rl.success) throw new RateLimitError()
  const { id: gameId } = await ctx!.params

  // 支持 FormData（含图片）和 JSON 两种格式
  let content: string | undefined
  let imageUrl: string | undefined
  let parentId: string | undefined

  const contentType = req.headers.get("content-type") || ""
  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData()
    content = fd.get("content") as string | undefined
    imageUrl = fd.get("imageUrl") as string | undefined
    parentId = fd.get("parentId") as string | undefined
    const imageFile = fd.get("image") as File | null
    if (imageFile && imageFile.size > 0) {
      const { UPLOAD } = await import("@/lib/config")
      if (imageFile.size > UPLOAD.IMAGE_MAX_SIZE) throw new ValidationError("图片太大，最多 10MB")
      if (!UPLOAD.IMAGE_TYPES.includes(imageFile.type)) throw new ValidationError("不支持的图片格式")
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const ext = imageFile.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg"
      const { getStorage } = await import("@/lib/storage")
      const result = await getStorage().upload(buffer, "comments", ext)
      imageUrl = result.url
    }
  } else {
    const body = await safeParseJson(req)
    content = body.content
    imageUrl = body.imageUrl
    parentId = body.parentId
  }

  const comment = await gameService.createComment(userId, gameId, content ?? "", imageUrl, parentId)
  // A-8：评论 include 在详情页同一次查询里，写成功后失效对应 Data Cache
  try {
    revalidateTag(gameTag(comment.gameId), { expire: 0 })
    revalidateTag(CacheTag.gameDetail, { expire: 0 })
  } catch {
    /* revalidateTag 仅在请求上下文可用，非请求场景静默忽略 */
  }
  return created(comment)
})
