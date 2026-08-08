import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { userService } from "@/services/user"
import { prisma } from "@/lib/prisma"

export const GET = withHandler(async () => {
  const { userId } = await requireAuth()
  const [frames, owned, marksSum] = await Promise.all([
    prisma.avatarFrame.findMany({
      where: { isPublic: true },
      orderBy: [{ price: "asc" }, { sort: "asc" }],
      select: { id: true, name: true, description: true, imageUrl: true, price: true },
    }),
    prisma.userAvatarFrame.findMany({
      where: { userId },
      select: { avatarFrameId: true },
    }),
    prisma.checkIn.aggregate({ where: { userId }, _sum: { marks: true } }),
  ])
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { marksSpent: true },
  })
  const totalMarks = marksSum._sum.marks ?? 0
  return json({
    frames,
    ownedFrameIds: owned.map((o) => o.avatarFrameId),
    totalMarks,
    availableMarks: totalMarks - (user?.marksSpent ?? 0),
  })
})

export const PUT = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const body = await safeParseJson(req)
  const frameId = body.avatarFrameId ?? body.frameId ?? null
  const result = await userService.setAvatarFrame(userId, frameId)
  return json(result)
})
