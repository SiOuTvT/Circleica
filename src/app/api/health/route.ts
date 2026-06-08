import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { cache, isRedisAvailable } from "@/lib/redis"
import { NextResponse } from "next/server"

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  uptime: number
  version: string
  checks: {
    database: { status: "ok" | "error"; latency?: number }
    redis: { status: "ok" | "error" | "disabled"; latency?: number }
  }
}

const startTime = Date.now()

export async function GET() {
  const checks: HealthStatus["checks"] = {
    database: { status: "error" },
    redis: { status: "disabled" },
  }

  // 检查数据库
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: "ok", latency: Date.now() - dbStart }
  } catch (error) {
    logger.db.error("[Health] Database check failed", error)
  }

  // 检查 Redis（只读，不修改状态）
  if (isRedisAvailable()) {
    try {
      const redisStart = Date.now()
      // 使用 EXISTS 代替 SET+GET，避免修改 Redis 状态
      await cache.get("health:ping")
      checks.redis = { status: "ok", latency: Date.now() - redisStart }
    } catch (error) {
      logger.db.error("[Health] Redis check failed", error)
      checks.redis = { status: "error" }
    }
  }

  // 判断整体状态
  let status: HealthStatus["status"] = "healthy"
  if (checks.database.status === "error") {
    status = "unhealthy"
  } else if (checks.redis.status === "error") {
    status = "degraded"
  }

  const body: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || "unknown",
    checks,
  }

  const httpStatus = status === "unhealthy" ? 503 : 200

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}