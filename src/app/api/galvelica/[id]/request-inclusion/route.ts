import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { createDraftGameFromWork } from "@/lib/galvelica/work-service"

/**
 * POST /api/galvelica/<workId>/request-inclusion
 * 采纳模型 A：提交「收录到 Circleica」申请即自动用融合字段建一份未发布 Game 草稿，
 * 并记一条 APPROVED 请求（供后台追溯）。已存在对应资源（草稿/已发布）则返回 409。
 * 游客也可提交（requestedBy 为空）。
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

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
