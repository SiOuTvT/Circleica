import { withHandler, json } from "@/lib/api-handler"
import { profileDataService } from "@/services/user"

export const GET = withHandler(async (_req, ctx) => {
  const { id } = await ctx!.params
  const data = await profileDataService.getFavorites(id)
  return json(data)
})
