import { badRequest, created, serverError } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]

export async function POST(req: Request) {
  // 防止已初始化站点使用此接口
  try {
    const initialized = await prisma.siteSetting.findUnique({
      where: { key: "initialized" },
      select: { value: true },
    })
    if (initialized?.value === "true") {
      return badRequest("站点已初始化，请使用管理后台上传")
    }
  } catch {
    // 数据库未就绪时允许上传（setup 阶段）
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return badRequest("请求格式错误")
  }

  const file = formData.get("file") as File | null
  if (!file) return badRequest("请选择文件")

  if (file.size > MAX_SIZE) return badRequest("文件大小不能超过 2MB")
  if (!ALLOWED_TYPES.includes(file.type)) return badRequest("仅支持 PNG、JPEG、WebP、SVG、GIF 格式")

  try {
    const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png"
    const filename = `site-logo-${Date.now()}.${ext}`
    const uploadDir = path.join(process.cwd(), "public", "uploads", "site")
    await mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, filename), buffer)

    const url = `/uploads/site/${filename}`
    return created({ url })
  } catch {
    return serverError("文件保存失败")
  }
}
