import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { sanitizeFilename } from "@/lib/sanitize"
import { put } from "@vercel/blob"
import crypto from "crypto"

export const POST = withHandler(async (req) => {
  await requireAdminRole()

  const formData = await req.formData()
  const file = formData.get("file") as File

  if (!file || !file.type.startsWith("image/")) {
    throw new Error("请上传图片文件")
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("图片大小不能超过 5MB")
  }

  const safeName = sanitizeFilename(file.name) || `${crypto.randomBytes(4).toString("hex")}.jpg`
  const blob = await put(`checkin/${Date.now()}-${safeName}`, file, {
    access: "public",
  })

  return json({ url: blob.url })
})
