import { withHandler, json } from "@/lib/api-handler"
import { profileDataService } from "@/services/user"

export const GET = withHandler(async (req, ctx) => {
  const { id } = await ctx!.params
  const data = await profileDataService.getActivities(id, { limit: 20 })
  return json(data)
})
