import { checkAchievements, invalidateUserStats } from "@/lib/achievements"
import { conflict, ok, serverError, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { withRateLimit } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
import { rateLimits } from "@/lib/rate-limit"
import { NextRequest } from "next/server"

async function handleCheckin(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  // 使用 Asia/Shanghai 时区计算日期
  const now = new Date()
  const todayStr = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })
  const today = new Date(todayStr + "T00:00:00.000Z")

  // 使用事务确保原子性，防止并发重复签到
  const result = await prisma.$transaction(async (tx) => {
    // 在事务内再次检查
    const existing = await tx.checkIn.findUnique({
      where: { userId_date: { userId: session.user.id, date: today } },
    })
    if (existing) {
      return { alreadyDone: true }
    }

    // 随机生成印记数量（0-5，按概率分布）
    // 0=2%, 1=8%, 2=15%, 3=25%, 4=30%, 5=20%
    const rand = Math.random() * 100
    let marks = 0
    if (rand < 2) marks = 0
    else if (rand < 10) marks = 1
    else if (rand < 25) marks = 2
    else if (rand < 50) marks = 3
    else if (rand < 80) marks = 4
    else marks = 5

    // 创建签到记录
    await tx.checkIn.create({ data: { userId: session.user.id, date: today, marks } })

    // 获取总签到次数
    const total = await tx.checkIn.count({ where: { userId: session.user.id } })

    return { marks, total }
  })

  // 如果已签到，返回冲突响应
  if (result.alreadyDone) {
    logger.user.debug(`User ${session.user.id} already checked in today`)
    return conflict("今日已签到", { alreadyDone: true })
  }

  logger.user.info(`User ${session.user.id} checked in. Total: ${result.total}, Marks: ${result.marks}`)

  // 异步检查成就解锁（不阻塞响应），并清除用户统计缓存
  invalidateUserStats(session.user.id).catch(() => {})
  checkAchievements(session.user.id).catch(() => {})

  return ok({ ok: true, total: result.total, date: todayStr, marks: result.marks })
}

export const POST = (req: NextRequest) =>
  withRateLimit(handleCheckin, rateLimits.api, "checkin")(req)

async function handleGetCheckinStatus() {
  const session = await auth()
  if (!session?.user?.id) return ok({ checkedIn: false, total: 0 })

  try {
    const now = new Date()
    const todayStr = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })
    const today = new Date(todayStr + "T00:00:00.000Z")
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
