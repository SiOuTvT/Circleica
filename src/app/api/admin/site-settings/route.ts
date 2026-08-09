import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"

export const GET = withHandler(async () => {
  await requireAdminRole("ADMIN")
  const settings = await getSiteSettings()
  return json(settings)
})

export const POST = withHandler(async (req) => {
  // 站点设置（含站点页面富文本 page_about/page_rules/page_contact，前台全站渲染）
  // 属于 SUPER_ADMIN 专属：proxy 层已按 SUPER_ADMIN_ROUTES 拦截页面访问，
  // API 层必须同级校验，否则普通 ADMIN 可直接 POST 绕过页面限制篡改全站内容。
  await requireAdminRole("SUPER_ADMIN")
  const body = await safeParseJson(req)
  const updated = await updateSiteSettings(body)
  return json(updated)
})
