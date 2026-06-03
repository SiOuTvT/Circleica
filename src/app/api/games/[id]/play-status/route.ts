import { checkAchievements } from "@/lib/achievements"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id: gameId } = await params
  const { status } = await req.json()

  if (!["想玩", "在玩", "玩过"].includes(status))
    return NextResponse.json({ error: "无效状态" }, { status: 400 })

  await prisma.playStatus.upsert({
    where: { userId_gameId: { userId: session.user.id, gameId } },
    create: { userId: session.user.id, gameId, status },
    update: { status },
  })

  // 异步检查成就解锁（不阻塞响应）
  checkAchievements(session.user.id).catch(() => {})

  return NextResponse.json({ status })
}
