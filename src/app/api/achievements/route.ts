import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"

export const GET = withHandler(async () => {
  const achievements = await prisma.achievement.findMany({
    where: { isActive: true },
    orderBy: { category: "asc" },
  })
  return json(achievements)
})
