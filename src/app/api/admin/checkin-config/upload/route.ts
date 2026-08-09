import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { ValidationError } from "@/lib/errors"
import { getStorage } from "@/lib/storage"
import sharp from "sharp"

// 白名单 MIME（与公共 /api/upload 一致）。显式排除 image/svg+xml：
// SVG 可内嵌脚本，即使扩展名被改成 jpg，若被当作 image/svg+xml 服务仍可能触发存储型 XSS。
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
}

export const POST = withHandler(async (req) => {
  await requireAdminRole()

  const formData = await req.formData()
  const file = formData.get("file") as File

  if (!file) {
    throw new ValidationError("未找到文件")
  }
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    throw new ValidationError(`不支持的文件类型: ${file.type}。支持: JPEG, PNG, GIF, WebP, AVIF（SVG 已禁用）`)
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new ValidationError("图片大小不能超过 5MB")
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // 用 sharp 验证图片内容完整（拒绝伪装成图片的脚本/超小文件）
  const metadata = await sharp(buffer).metadata()
  if (buffer.length < 100) {
    throw new ValidationError("图片文件过小，可能已损坏")
  }
  if (!metadata.width) {
    throw new ValidationError("无法读取图片尺寸，文件可能已损坏")
  }

  const storage = getStorage()
  const result = await storage.upload(buffer, "checkin", ext)

  return json({ url: result.url })
})
