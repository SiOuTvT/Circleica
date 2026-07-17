import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { getStorage } from "@/lib/storage"
import { UPLOAD } from "@/lib/config"
import { ValidationError, RateLimitError } from "@/lib/errors"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import sharp from "sharp"

/**
 * POST /api/upload
 * 通用图片上传
 */
export const POST = withHandler(async (req) => {
  const rl = await checkRateLimit(rateLimits.upload)
  if (!rl.success) throw new RateLimitError()
  await requireAuth()

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) throw new ValidationError("未找到文件")

  // 验证文件类型
  if (!UPLOAD.IMAGE_TYPES.includes(file.type)) {
    throw new ValidationError(`不支持的文件类型: ${file.type}。支持: JPEG, PNG, GIF, WebP, AVIF`)
  }

  // 验证文件大小
  if (file.size > UPLOAD.IMAGE_MAX_SIZE) {
    throw new ValidationError(`文件太大: ${(file.size / 1024 / 1024).toFixed(1)}MB，最大 ${UPLOAD.IMAGE_MAX_SIZE / 1024 / 1024}MB`)
  }

  // 确定扩展名
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
  }
  const ext = mimeToExt[file.type] || "png"

  const buffer = Buffer.from(await file.arrayBuffer())

  // 验证图片完整性
  const metadata = await sharp(buffer).metadata()
  if (buffer.length < 100) {
    throw new ValidationError("图片文件过小，可能已损坏")
  }
  if (!metadata.width) {
    throw new ValidationError("无法读取图片尺寸，文件可能已损坏")
  }

  // 上传
  const storage = getStorage()
  const result = await storage.upload(buffer, "images", ext)

  return json({
    url: result.url,
    key: result.key,
    size: file.size,
    type: file.type,
  })
})
