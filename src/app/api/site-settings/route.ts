import { withHandler, json } from "@/lib/api-handler"
import { getSiteSettings } from "@/lib/site-settings"

export const GET = withHandler(async () => {
  const settings = await getSiteSettings()
  return json(settings)
})
