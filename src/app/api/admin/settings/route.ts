import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"
import { logoModeSchema } from "@/lib/validations"

// 允许通过此端点修改的配置键名白名单
const ALLOWED_KEYS = new Set([
  "default_placeholder_image",
  "site_name",
  "site_description",
  "site_logo",
  "logo_mode",
  "registration_enabled",
  "themeColor",
  "email_verification_enabled",
  "email_verification_required_for_login",
  "send_welcome_email",
])

// GET /api/admin/settings — 获取所有站点配置
export const GET = withHandler(async () => {
  await requireAdminRole("SUPER_ADMIN")
  const settings = await getSiteSettings()
  return json(settings)
})

// PUT /api/admin/settings — 批量更新站点配置
export const PUT = withHandler(async (req) => {
  await requireAdminRole("SUPER_ADMIN")
  const body = await safeParseJson(req)
  const filtered = Object.fromEntries(
    Object.entries(body)
      .filter(
        ([k, v]) => ALLOWED_KEYS.has(k) && (typeof v === "string" || typeof v === "boolean" || typeof v === "number"),
      )
      .map(([k, v]) => [k, String(v)]),
  )
  // logo_mode 取值约束：仅允许 full / icon，非法值回退 full
  if ("logo_mode" in filtered) {
    const parsed = logoModeSchema.safeParse(filtered.logo_mode)
    filtered.logo_mode = parsed.success ? parsed.data : "full"
  }
  await updateSiteSettings(filtered)
  return json({ success: true })
})
