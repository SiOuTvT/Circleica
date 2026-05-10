import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB for base64 storage
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
]

/**
 * 文件上传 API
 * 将图片转为 base64 data URI 存储，零配置，不需要任何外部服务
 * 适合少量图片场景（公告图、头像等，< 20 张）
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
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

    // 转为 base64 data URI
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString("base64")
    const dataUri = `data:${file.type};base64,${base64}`

    console.log(`✓ 图片已转为 base64: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`)

    return NextResponse.json({
      url: dataUri,
      key: `base64-${Date.now()}`,
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