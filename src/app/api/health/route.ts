import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { realPrisma } from "@/lib/prisma"
import { cache, isRedisAvailable } from "@/lib/redis"
import { probeStorage } from "@/lib/storage"
import { withHandler } from "@/lib/api-handler"
import { getRequestContext } from "@/lib/request-context"

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  uptime: number
  version: string
  requestId: string
  checks: {
    database: { status: "ok" | "error"; latency?: number }
    redis: { status: "ok" | "error" | "disabled"; latency?: number }
    storage: { status: "ok" | "error" | "disabled"; latency?: number; detail?: string }
  }
}

const startTime = Date.now()

export const GET = withHandler(async (_req) => {
  const checks: HealthStatus["checks"] = {
    database: { status: "error" },
    redis: { status: "disabled" },
    storage: { status: "disabled" },
  }

  // 检查数据库
  try {
    const dbStart = Date.now()
    await realPrisma.$queryRaw`SELECT 1`
    checks.database = { status: "ok", latency: Date.now() - dbStart }
  } catch (error) {
    logger.db.error("[Health] Database check failed", error)
  }

  // 检查 Redis（只读，不修改状态）
  if (isRedisAvailable()) {
    try {
      const redisStart = Date.now()
      await cache.get("health:ping")
      checks.redis = { status: "ok", latency: Date.now() - redisStart }
    } catch (error) {
      logger.db.error("[Health] Redis check failed", error)
      checks.redis = { status: "error" }
    }
  }

  // 检查存储可用性（B-34，只读探测）
  try {
    const sStart = Date.now()
    const sp = await probeStorage()
    checks.storage = {
      status: sp.ok ? "ok" : "error",
      latency: Date.now() - sStart,
      detail: `${sp.backend}${sp.detail ? ` ${sp.detail}` : ""}`.trim(),
    }
  } catch (error) {
    logger.db.error("[Health] Storage probe failed", error)
    checks.storage = { status: "error" }
  }

  // 判断整体状态
  let status: HealthStatus["status"] = "healthy"
  if (checks.database.status === "error") {
    status = "unhealthy"
  } else if (checks.redis.status === "error" || checks.storage.status === "error") {
    status = "degraded"
  }

  const body: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || "unknown",
    requestId: getRequestContext()?.requestId ?? "unknown",
    checks,
  }

  return NextResponse.json(body, {
    status: status === "unhealthy" ? 503 : 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
})
