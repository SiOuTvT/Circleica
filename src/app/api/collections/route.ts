import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

// 获取用户的收藏集列表
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const [collections, ungroupedCount, totalCount] = await Promise.all([
      prisma.collection.findMany({
        where: { userId: session.user.id },
        include: { _count: { select: { favorites: true } } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.favorite.count({
        where: { userId: session.user.id, collectionId: null },
      }),
      prisma.favorite.count({
        where: { userId: session.user.id },
      }),
    ])

    return ok({ collections, ungroupedCount, totalCount })
  } catch (error) {
    logger.user.error("[Collections API] GET failed", error)
    return serverError("获取收藏集失败")
  }
}

// 创建新收藏集
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const body = await req.json()
    const { name, description } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return badRequest("收藏集名称不能为空")
    }

    if (name.trim().length > 50) {
      return badRequest("收藏集名称不能超过50个字符")
    }

    const collection = await prisma.collection.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        description: description?.trim() || "",
      },
      include: {
        _count: { select: { favorites: true } },
      },
    })

    return ok(collection)
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return badRequest("已存在同名收藏集")
    }
    logger.user.error("[Collections API] POST failed", error)
    return serverError("创建收藏集失败")
  }
}