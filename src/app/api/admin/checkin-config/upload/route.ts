import { requireAdmin } from "@/lib/admin"
import { serverError, unauthorized, success } from "@/lib/api-response"
import { sanitizeFilename } from "@/lib/sanitize"
import { NextRequest } from "next/server"
import { put } from "@vercel/blob"
import crypto from "crypto"

// POST /api/admin/checkin-config/upload - 上传签到卡片图片
async function handlePost(req: NextRequest) {
  try {
    await requireAdmin()

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file || !file.type.startsWith("image/")) {
      return serverError("请上传图片文件")
    }

    // 验证文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      return serverError("图片大小不能超过 5MB")
    }

    // 使用 Vercel Blob 存储（sanitizeFilename 防止路径遍历）
    const safeName = sanitizeFilename(file.name) || `${crypto.randomBytes(4).toString("hex")}.jpg`
    const blob = await put(`checkin/${Date.now()}-${safeName}`, file, {
      access: "public",
    })

    return success({ url: blob.url })
  } catch (error) {
    console.error("Upload error:", error)
    return serverError("上传失败，请稍后重试")
  }
}

export { handlePost as POST }