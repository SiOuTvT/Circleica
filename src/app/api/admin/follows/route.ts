import { withHandler, json, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdminRole()
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const limit = 20
  const skip = (page - 1) * limit

  const [follows, total] = await Promise.all([
    prisma.follow.findMany({
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: {
        follower: { select: { id: true, username: true, avatar: true } },
        following: { select: { id: true, username: true, avatar: true } },
      },
    }),
    prisma.follow.count(),
  ])

  return json({ follows, total, page, limit })
})

export const DELETE = withHandler(async (req) => {
  await requireAdminRole()
  const { id } = await req.json()
  await prisma.follow.delete({ where: { id } })
  return noContent()
})
