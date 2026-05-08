import { ok, serverError } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const creators = await prisma.creator.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        nameJa: true,
        avatar: true,
        gender: true,
        games: { select: { role: true }, take: 1 },
        _count: { select: { games: true } },
      },
    })
    return ok(creators)
  } catch (error) {
    console.error("[Creators API] Failed to fetch creators:", error)
    return serverError("获取创作者列表失败")
  }
}
