import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "请选择要删除的游戏" }, { status: 400 })
  }

  // 使用事务保护批量删除，确保数据一致性
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 删除游戏关联的标签关系
      await tx.gameTag.deleteMany({ where: { gameId: { in: ids } } })
      // 删除游戏关联的资源
      await tx.gameResource.deleteMany({ where: { gameId: { in: ids } } })
      // 删除游戏关联的评论
      await tx.comment.deleteMany({ where: { gameId: { in: ids } } })
      // 删除游戏关联的收藏
      await tx.favorite.deleteMany({ where: { gameId: { in: ids } } })
      // 删除游戏关联的举报
      await tx.gameReport.deleteMany({ where: { gameId: { in: ids } } })
      // 最后删除游戏本身
      const deleteResult = await tx.game.deleteMany({ where: { id: { in: ids } } })
      return deleteResult
    })
    return NextResponse.json({ ok: true, deleted: result.count })
  } catch (error) {
    console.error("[BatchDelete] Transaction failed", error)
    return NextResponse.json({ error: "批量删除失败，请重试" }, { status: 500 })
  }
}