import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getRateLimit, getClientIP, rateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  // 速率限制检查
  const ip = getClientIP(req)
  const key = `checkin:${ip}`

  const limit = getRateLimit(key, rateLimits.api)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: rateLimits.api.message || "请求过于频繁" },
      { status: 429 }
    )
  }

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  try {
    const existing = await prisma.checkIn.findUnique({
      where: { userId_date: { userId: session.user.id, date: today } },
    })
    if (existing) {
      logger.user.debug(`User ${session.user.id} already checked in today`)
      return NextResponse.json({ error: "今日已签到", alreadyDone: true }, { status: 409 })
    }

    await prisma.checkIn.create({ data: { userId: session.user.id, date: today } })

    const total = await prisma.checkIn.count({ where: { userId: session.user.id } })
    logger.user.info(`User ${session.user.id} checked in. Total: ${total}`)
    return NextResponse.json({ ok: true, total, date: today })
  } catch (error) {
    logger.user.error('Check-in failed', error, { userId: session.user.id })
    return NextResponse.json({ error: "签到失败，请稍后重试" }, { status: 500 })
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ checkedIn: false, total: 0 })

  try {
    const today = new Date().toISOString().slice(0, 10)
    const [existing, total] = await Promise.all([
      prisma.checkIn.findUnique({ where: { userId_date: { userId: session.user.id, date: today } } }),
      prisma.checkIn.count({ where: { userId: session.user.id } }),
    ])

    return NextResponse.json({ checkedIn: !!existing, total })
  } catch (error) {
    logger.user.error('Get check-in status failed', error, { userId: session.user.id })
    return NextResponse.json({ checkedIn: false, total: 0, error: "获取签到状态失败" })
  }
}
