import { badRequest, notFound, ok, serverError, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

// 更新收藏集
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { id } = await params

  try {
    const collection = await prisma.collection.findUnique({ where: { id } })
    if (!collection || collection.userId !== session.user.id) return notFound()

    const body = await req.json()
    const { name, description, sortOrder } = body

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return badRequest("收藏集名称不能为空")
      }
      if (name.trim().length > 50) {
        return badRequest("收藏集名称不能超过50个字符")
      }
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: { _count: { select: { favorites: true } } },
    })

    return ok(updated)
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return badRequest("已存在同名收藏集")
    }
    console.error("[Collection API] PUT failed:", error)
    return serverError("更新收藏集失败")
  }
}

// 删除收藏集
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { id } = await params

  try {
    const collection = await prisma.collection.findUnique({ where: { id } })
    if (!collection || collection.userId !== session.user.id) return notFound()

    if (collection.isDefault) {
      return badRequest("不能删除默认收藏集")
    }

    // 把该收藏集中的收藏移到未分组
    await prisma.favorite.updateMany({
      where: { collectionId: id },
      data: { collectionId: null },
    })

    await prisma.collection.delete({ where: { id } })

    return ok({ success: true })
  } catch (error) {
    console.error("[Collection API] DELETE failed:", error)
    return serverError("删除收藏集失败")
  }
}