import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { cache, cacheKey } from "@/lib/redis"
import { createDraftGameFromWork } from "@/lib/galvelica/work-service"

/**
 * POST /api/galvelica/<workId>/request-inclusion
 * 采纳模型 A：提交「收录到 Circleica」申请即自动用融合字段建一份未发布 Game 草稿，
 * 并记一条 APPROVED 请求（供后台追溯）。已存在对应资源（草稿/已发布）则返回 409。
 * 游客也可提交（requestedBy 为空）。
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 频限：单 IP 10 分钟内最多 10 次收录申请，防刷（redis 不可用时放行）
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()) || "anonymous"
  const rlKey = cacheKey("rl:inclusion", ip)
  try {
    const count = (await cache.get<number>(rlKey)) || 0
    if (count >= 10) {
      return NextResponse.json({ error: "操作过于频繁，请稍后再试" }, { status: 429 })
    }
    await cache.set(rlKey, count + 1, 600)
  } catch {
    // 缓存故障不影响主流程
  }

  const work = await prisma.work.findUnique({
    where: { id },
    select: { id: true, gameId: true, title: true },
  })
  if (!work) {
    return NextResponse.json({ error: "作品不存在" }, { status: 404 })
  }
  if (work.gameId) {
    return NextResponse.json(
      { error: "该作品已存在对应资源（草稿或已发布）", alreadyIncluded: true },
      { status: 409 },
    )
  }

  const session = await auth()
  const userId = (session as { user?: { id?: string } } | null)?.user?.id ?? null

  let note = ""
  try {
    const body = (await req.json()) as { note?: unknown }
    if (typeof body.note === "string") note = body.note.slice(0, 500)
  } catch {
    // 无 body 也可
  }

  let gameId: string
  try {
    gameId = await createDraftGameFromWork(id)
  } catch (e) {
    logger.api.error("[request-inclusion] draft create failed", e)
    return NextResponse.json({ error: "建草稿失败" }, { status: 500 })
  }

  try {
    await prisma.inclusionRequest.create({
      data: { workId: id, requestedBy: userId, note, status: "APPROVED", decidedAt: new Date(), reviewedBy: null },
    })
  } catch {
    // 草稿已建，请求记录失败不影响主流程
  }

  return NextResponse.json({ ok: true, gameId })
}
