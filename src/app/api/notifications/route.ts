import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/notifications - 获取当前用户的通知
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const cursor = req.nextUrl.searchParams.get("cursor")
  const limit = 20

  const where = { userId: session.user.id }

  const notifications = await prisma.notification.findMany({
    where,
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { id: true, serialId: true, username: true, avatar: true } },
    },
  })

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  })

  // 批量获取关联的游戏信息
  const gameIds = [...new Set(
    notifications
      .filter(n => n.targetType === "game")
      .map(n => n.targetId)
  )]
  const gameMap: Record<string, { id: string; title: string }> = {}
  if (gameIds.length > 0) {
    const games = await prisma.game.findMany({
      where: { id: { in: gameIds } },
      select: { id: true, title: true },
    })
    for (const g of games) {
      gameMap[g.id] = { id: g.id, title: g.title }
    }
  }

  // 附加游戏信息到通知
  const enrichedNotifications = notifications.map(n => ({
    ...n,
    targetGame: n.targetType === "game" ? gameMap[n.targetId] ?? null : null,
  }))

  const nextCursor = notifications.length === limit ? notifications[limit - 1].id : null

  return NextResponse.json({ notifications: enrichedNotifications, unreadCount, nextCursor })
}

// POST /api/notifications/read - 标记通知为已读
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  let ids: string[] | undefined
  try {
    const body = await req.json()
    ids = body.ids
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }

  if (ids && Array.isArray(ids) && ids.length > 0) {
    // 标记指定通知为已读
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId: session.user.id },
      data: { isRead: true },
    })
  } else {
    // 标记所有通知为已读
    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/notifications - 删除通知
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  let ids: string[] | undefined
  try {
    const body = await req.json()
    ids = body.ids
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }

  if (ids && Array.isArray(ids) && ids.length > 0) {
    await prisma.notification.deleteMany({
      where: { id: { in: ids }, userId: session.user.id },
    })
  } else {
    await prisma.notification.deleteMany({
      where: { userId: session.user.id },
    })
  }

  return NextResponse.json({ ok: true })
}
