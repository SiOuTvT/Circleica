import { conflict, ok, serverError, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { withRateLimit } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
import { rateLimits } from "@/lib/rate-limit"
import { NextRequest } from "next/server"

async function handleCheckin(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  try {
    const existing = await prisma.checkIn.findUnique({
      where: { userId_date: { userId: session.user.id, date: today } },
    })
    if (existing) {
      logger.user.debug(`User ${session.user.id} already checked in today`)
      return conflict("今日已签到", { alreadyDone: true })
    }

    await prisma.checkIn.create({ data: { userId: session.user.id, date: today } })

    const total = await prisma.checkIn.count({ where: { userId: session.user.id } })
    logger.user.info(`User ${session.user.id} checked in. Total: ${total}`)
    return ok({ ok: true, total, date: today })
  } catch (error) {
    logger.user.error("Check-in failed", error, { userId: session.user.id })
    return serverError("签到失败，请稍后重试")
  }
}

export const POST = (req: NextRequest) =>
  withRateLimit(handleCheckin, rateLimits.api, "checkin")(req)

async function handleGetCheckinStatus() {
  const session = await auth()
  if (!session?.user?.id) return ok({ checkedIn: false, total: 0 })

  try {
    const today = new Date().toISOString().slice(0, 10)
    const [existing, total] = await Promise.all([
      prisma.checkIn.findUnique({ where: { userId_date: { userId: session.user.id, date: today } } }),
      prisma.checkIn.count({ where: { userId: session.user.id } }),
    ])

    return ok({ checkedIn: !!existing, total })
  } catch (error) {
    logger.user.error("Get check-in status failed", error, { userId: session.user.id })
    return ok({ checkedIn: false, total: 0, error: "获取签到状态失败" })
  }
}

export const GET = handleGetCheckinStatus
