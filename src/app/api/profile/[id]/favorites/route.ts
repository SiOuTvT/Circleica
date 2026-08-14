import { withHandler, json } from "@/lib/api-handler"
import { profileDataService } from "@/services/user"

export const GET = withHandler(async (req, ctx) => {
  const { id } = await ctx!.params
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1)
  const data = await profileDataService.getFavorites(id, { page })
  return json(data)
})
