import { withHandler, json } from "@/lib/api-handler"
import { announcementService } from "@/services/announcement"

export const GET = withHandler(async () => {
  const data = await announcementService.getPublished()
  return json(data)
})
