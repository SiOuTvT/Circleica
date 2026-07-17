import { withHandler, json } from "@/lib/api-handler"
import { getPublicSiteSettings } from "@/lib/site-settings"

export const GET = withHandler(async () => {
  const settings = await getPublicSiteSettings()
  return json(settings)
})
