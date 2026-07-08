import { withHandler, json, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdminRole()
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const limit = 20
  const skip = (page - 1) * limit

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      orderBy: { id: "desc" },
      skip, take: limit,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        game: { select: { id: true, title: true, coverImage: true } },
      },
    }),
    prisma.favorite.count(),
  ])

  return json({ favorites, total, page, limit })
})

export const DELETE = withHandler(async (req) => {
  await requireAdminRole()
  const { id } = await req.json()
  await prisma.favorite.delete({ where: { id } })
  return noContent()
})
