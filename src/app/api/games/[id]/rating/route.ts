import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { id: gameId } = await params
  let score: number
  try {
    const body = await req.json()
    score = body.score
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  if (!score || score < 1 || score > 5) return NextResponse.json({ error: "评分需在1-5之间" }, { status: 400 })

  await prisma.gameRating.upsert({
    where:  { gameId_userId: { gameId, userId: session.user.id } },
    create: { gameId, userId: session.user.id, score },
    update: { score },
  })

  const agg = await prisma.gameRating.aggregate({
    where: { gameId },
    _avg:   { score: true },
    _count: { score: true },
  })

  return NextResponse.json({
    avg:   Math.round((agg._avg.score ?? 0) * 10) / 10,
    count: agg._count.score,
    mine:  score,
  })
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  const { id: gameId } = await params

  const [agg, mine] = await Promise.all([
    prisma.gameRating.aggregate({
      where: { gameId },
      _avg:   { score: true },
      _count: { score: true },
    }),
    session?.user?.id
      ? prisma.gameRating.findUnique({ where: { gameId_userId: { gameId, userId: session.user.id } } })
      : null,
  ])

  return NextResponse.json({
    avg:   Math.round((agg._avg.score ?? 0) * 10) / 10,
    count: agg._count.score,
    mine:  mine?.score ?? null,
  })
}
