import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { ValidationError } from "@/lib/errors"
import crypto from "crypto"

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
// SVG 已移除 — 可嵌入脚本导致 XSS
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
}

export const POST = withHandler(async (req) => {
  // 防止已初始化站点使用此接口
  const initialized = await prisma.siteSetting.findUnique({
    where: { key: "initialized" },
    select: { value: true },
  })
  if (initialized?.value === "true") {
    throw new ValidationError("站点已初始化，请使用管理后台上传")
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) throw new ValidationError("请选择文件")
  if (file.size > MAX_SIZE) throw new ValidationError("文件大小不能超过 2MB")
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) throw new ValidationError("仅支持 PNG、JPEG、WebP、GIF 格式")

  const filename = `site-logo-${crypto.randomBytes(8).toString("hex")}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "site")
  await mkdir(uploadDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadDir, filename), buffer)

  const url = `/uploads/site/${filename}`
  return json({ url })
})
