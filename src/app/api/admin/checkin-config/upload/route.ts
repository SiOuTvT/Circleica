import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { ValidationError } from "@/lib/errors"
import { getStorage } from "@/lib/storage"

export const POST = withHandler(async (req) => {
  await requireAdminRole()

  const formData = await req.formData()
  const file = formData.get("file") as File

  if (!file || !file.type.startsWith("image/")) {
    throw new ValidationError("请上传图片文件")
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new ValidationError("图片大小不能超过 5MB")
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg"
  const buffer = Buffer.from(await file.arrayBuffer())
  const storage = getStorage()
  const result = await storage.upload(buffer, "checkin", safeExt)

  return json({ url: result.url })
})
