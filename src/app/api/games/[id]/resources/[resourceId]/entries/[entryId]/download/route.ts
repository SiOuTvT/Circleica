import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { NotFoundError } from "@/lib/errors"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

/** 内存级防刷：同一资源分流 60s 内仅计一次（IP + entryId 维度），避免刷新/误点刷爆计数 */
const recentDownloads = new Map<string, number>()
const DL_WINDOW_MS = 60_000

export const POST = withHandler(async (req, ctx) => {
  const { id: gameId, resourceId, entryId } = (await ctx!.params) as {
    id: string
    resourceId: string
    entryId: string
  }

  // 匿名/全体防刷：单 IP 每分钟最多 60 次下载计数（防止批量刷下载计数、探测 entry.url、
  // 以及异常高频下载行为）。与下方 60s 同分流去重形成纵深防御；正常用户单次点击远达不到。
  const dlRl = await checkRateLimit(rateLimits.download)
  if (!dlRl.success) {
    return NextResponse.json(
      { success: false, error: "下载请求过于频繁，请稍后再试" },
      { status: 429, headers: { "Retry-After": String(dlRl.reset) } },
    )
  }

  // 尽力取登录用户（未登录也可计数，但不会写入"我的下载"历史）
  let userId: string | null = null
  try {
    const auth = await requireAuth()
    userId = auth.userId
  } catch {
    userId = null
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  // 校验资源归属该游戏
  const entry = await prisma.gameResourceEntry.findUnique({
    where: { id: entryId },
    select: { id: true, resource: { select: { id: true, gameId: true } } },
  })
  if (!entry || entry.resource.gameId !== gameId || entry.resource.id !== resourceId) {
    throw new NotFoundError("资源下载链接")
  }

  // 防刷：同 IP + 同分流 60s 内只计一次
  const key = `${ip}:${entryId}`
  const now = Date.now()
  const last = recentDownloads.get(key)
  if (last && now - last < DL_WINDOW_MS) {
    const count = await prisma.gameResourceEntry.findUnique({ where: { id: entryId }, select: { downloadCount: true } })
    return json({ downloadCount: count?.downloadCount ?? 0 })
  }
  recentDownloads.set(key, now)
  // 清理过期 key，防止内存无限增长
  if (recentDownloads.size > 5000) {
    for (const [k, t] of recentDownloads) {
      if (now - t > DL_WINDOW_MS) recentDownloads.delete(k)
    }
  }

  // 分流级与游戏级计数联动，放在同一事务里保证一致（游戏级计数用于首页卡片 / 详情页头部 / 搜索页展示）
  const updated = await prisma.$transaction(async (tx) => {
    const e = await tx.gameResourceEntry.update({
      where: { id: entryId },
      data: { downloadCount: { increment: 1 } },
      select: { downloadCount: true },
    })
    await tx.game.update({
      where: { id: gameId },
      data: { downloadCount: { increment: 1 } },
    })
    return e
  })

  // 登录用户写入"我的下载"历史（记录资源与游戏，供个人主页展示）
  if (userId) {
    await prisma.resourceDownloadLog.create({
      data: { userId, resourceId, gameId },
    }).catch((e) => {
      // 历史记录失败不影响计数，但记录以便排查
      logger.api.error("[download] 写入下载历史失败", e)
    })
  }

  return json({ downloadCount: updated.downloadCount })
})
