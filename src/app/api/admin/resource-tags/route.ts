import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { resourceTagService } from "@/services/admin"

export const GET = withHandler(async () => {
  await requireAdminRole()
  return json(await resourceTagService.getAll())
})

export const PUT = withHandler(async (req) => {
  await requireAdminRole()
  const { group, options } = await req.json()
  if (!group || !Array.isArray(options)) {
    return json({ success: false, error: "参数错误：需要 group 和 options" }, 400)
  }
  await resourceTagService.update(group, options)
  return json({ success: true })
})
