import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

// 获取用户的收藏集列表
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const collections = await prisma.collection.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { favorites: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    })

    // 获取未分组的收藏数量
    const ungroupedCount = await prisma.favorite.count({
      where: {
        userId: session.user.id,
        collectionId: null,
      },
    })

    // 获取总收藏数
    const totalCount = await prisma.favorite.count({
      where: { userId: session.user.id },
    })

    return ok({ collections, ungroupedCount, totalCount })
  } catch (error) {
    console.error("[Collections API] GET failed:", error)
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
    console.error("[Collections API] POST failed:", error)
    return serverError("创建收藏集失败")
  }
}