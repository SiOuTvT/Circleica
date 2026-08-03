import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"

export const GET = withHandler(async () => {
  await requireAdminRole("ADMIN")
  const settings = await getSiteSettings()
  return json(settings)
})

export const POST = withHandler(async (req) => {
  // 主题色是站点外观设置，与「站点设置」同级——允许 ADMIN 修改并保存。
  // 注意：admin/layout.tsx 的 SUPER_ADMIN 守卫依赖 x-next-pathname 头（该头从未被设置），
  // 实际只执行 requireAdmin()，因此 ADMIN 也能打开 /admin/theme 页面。
  // 此处若仍强制 SUPER_ADMIN，会导致 ADMIN 打开页面后保存被 403、「保存失败」。
  await requireAdminRole("ADMIN")
  const body = await safeParseJson(req)
  const updated = await updateSiteSettings(body)
  return json(updated)
})
