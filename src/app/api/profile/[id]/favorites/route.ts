import { ok, serverError } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: id },
      include: {
        game: {
          select: { id: true, serialId: true, title: true, coverImage: true, isNsfw: true, originalWork: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return ok({ favorites: favorites.map((f) => f.game) })
  } catch (error) {
    console.error("[Profile Favorites API]", error)
    return serverError("获取收藏失败")
  }
}
