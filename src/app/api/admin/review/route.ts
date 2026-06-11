import { getAdminSession } from "@/lib/admin"
import { logAudit } from "@/lib/audit-log"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = 20
  const skip = (page - 1) * limit

  const where = { isPublished: false }
  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      select: {
        id: true, serialId: true, title: true, coverImage: true,
        status: true, isNsfw: true, createdAt: true, rejectReason: true,
        publisher: { select: { id: true, username: true } },
      },
    }),
    prisma.game.count({ where }),
  ])

  return NextResponse.json({ games, total, page, limit })
}
export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const { gameId, action, reason } = await req.json().catch(() => ({}))
  if (!gameId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 })
  }

  const session = await getAdminSession()
  const now = new Date()

  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { title: true } })

  if (action === "approve") {
    await prisma.game.update({
      where: { id: gameId },
      data: { isPublished: true, publishedAt: now, reviewedBy: session!.user.id, reviewedAt: now, rejectReason: "" },
    })
    logAudit({ userId: session!.user.id, action: "approve_game", target: gameId, detail: `通过审核: ${game?.title ?? gameId}` })
  } else {
    await prisma.game.update({
      where: { id: gameId },
      data: { rejectReason: reason || "", reviewedBy: session!.user.id, reviewedAt: now },
    })
    logAudit({ userId: session!.user.id, action: "reject_game", target: gameId, detail: `拒回: ${game?.title ?? gameId}, 原因: ${reason || "无"}` })
  }

  return NextResponse.json({ ok: true })
}