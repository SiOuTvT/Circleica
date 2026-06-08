import { auth } from "@/lib/auth"
import { mkdir, writeFile } from "fs/promises"
import { NextResponse } from "next/server"
import path from "path"
import sharp from "sharp"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB（与 nginx client_max_body_size 一致）
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]

/**
 * 文件上传 API
 * 将图片保存到 public/uploads/ 目录，返回可访问的 URL 路径
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "未找到文件" }, { status: 400 })
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `不支持的文件类型: ${file.type}。支持: JPEG, PNG, GIF, WebP` },
        { status: 400 }
      )
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `文件太大: ${(file.size / 1024 / 1024).toFixed(1)}MB，最大 10MB` },
        { status: 400 }
      )
    }

    // 生成唯一文件名（根据实际 MIME 类型确定扩展名，避免 canvas blob 类型与文件名不匹配）
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/avif": "avif",
    }
    const ext = mimeToExt[file.type] || file.name.split(".").pop() || "png"
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const filename = `${timestamp}-${random}.${ext}`

    // 保存到 public/uploads/ 目录
    const uploadDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 验证图片完整性：用 sharp 尝试解析，确保不是损坏数据
    try {
      const metadata = await sharp(buffer).metadata()
      // 极小图片警告（< 100 bytes 可能是空图/占位图）
      if (buffer.length < 100) {
        return NextResponse.json(
          { error: "图片文件过小，可能已损坏" },
          { status: 400 }
        )
      }
      // 确保有宽高（SVG 等矢量图除外）
      if (!metadata.width && file.type !== "image/svg+xml") {
        return NextResponse.json(
          { error: "无法读取图片尺寸，文件可能已损坏" },
          { status: 400 }
        )
      }
      console.log(`✓ 图片校验通过: ${metadata.width}x${metadata.height}, format=${metadata.format}`)
    } catch (sharpErr) {
      console.error("图片校验失败（文件损坏）:", sharpErr)
      return NextResponse.json(
        { error: "图片文件损坏或格式不正确，请重新上传" },
        { status: 400 }
      )
    }

    await writeFile(path.join(uploadDir, filename), buffer)

    const url = `/uploads/${filename}`
    console.log(`✓ 图片已上传: ${url} (${(file.size / 1024).toFixed(1)}KB)`)

    return NextResponse.json({
      url,
      key: filename,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("上传失败:", error)
    return NextResponse.json(
      {
        error: "上传失败",
        details: "上传失败",
      },
      { status: 500 }
    )
  }
}