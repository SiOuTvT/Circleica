import { auth } from "@/lib/auth"
import { mkdir, writeFile } from "fs/promises"
import { NextResponse } from "next/server"
import path from "path"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
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
        { error: `文件太大: ${(file.size / 1024 / 1024).toFixed(1)}MB，最大 2MB` },
        { status: 400 }
      )
    }

    // 生成唯一文件名
    const ext = file.name.split(".").pop() || "png"
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const filename = `${timestamp}-${random}.${ext}`

    // 保存到 public/uploads/ 目录
    const uploadDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
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
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}