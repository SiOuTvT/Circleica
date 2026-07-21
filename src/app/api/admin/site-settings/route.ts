import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"

export const GET = withHandler(async () => {
  await requireAdminRole("SUPER_ADMIN")
  const settings = await getSiteSettings()
  return json(settings)
})

export const POST = withHandler(async (req) => {
  await requireAdminRole("SUPER_ADMIN")
  const body = await safeParseJson(req)
  const updated = await updateSiteSettings(body)
  return json(updated)
})
