import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { getSiteSettings, getPublicSiteSettings, updateSiteSettings } from "@/lib/site-settings"

// 全表 siteSetting 含 email_provider_* / r2_secret_access_key 等明文凭据，不可经 GET 落到前端 RSC payload。
// 故 GET 只返回公开白名单字段（PUBLIC_SETTING_KEYS），由 getPublicSiteSettings() 收敛凭据暴露面。
// POST 仍保留 SUPER_ADMIN 校验，可写全表；三个调用点只用 POST，不受影响。
export const GET = withHandler(async () => {
  await requireAdminRole("ADMIN")
  const settings = await getPublicSiteSettings()
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
