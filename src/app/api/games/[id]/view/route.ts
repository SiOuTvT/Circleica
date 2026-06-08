import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * 简单的内存频率限制：每个 IP 对同一游戏 10 秒内最多计数一次
 * 注意：x-forwarded-for 可被客户端伪造，但在有反向代理的部署环境下是可靠的
 * 此限流仅用于防止意外重复计数，非安全关键功能
 */
const recentViews = new Map<string, number>()

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 频率限制
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown"
    const key = `${ip}:${id}`
    const now = Date.now()
    const last = recentViews.get(key)
    if (last && now - last < 10_000) {
      return NextResponse.json({ counted: false, reason: "rate-limited" })
    }
    recentViews.set(key, now)
    // 定期清理过期条目
    if (recentViews.size > 10000) {
      for (const [k, ts] of recentViews) {
        if (now - ts > 60_000) recentViews.delete(k)
      }
    }

    await prisma.game.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })

    return NextResponse.json({ counted: true })
  } catch (error) {
    console.error("[Game View]", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
