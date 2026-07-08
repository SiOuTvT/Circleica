import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { ValidationError } from "@/lib/errors"

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]

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
  if (!ALLOWED_TYPES.includes(file.type)) throw new ValidationError("仅支持 PNG、JPEG、WebP、SVG、GIF 格式")

  const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png"
  const filename = `site-logo-${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "site")
  await mkdir(uploadDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadDir, filename), buffer)

  const url = `/uploads/site/${filename}`
  return json({ url })
})
