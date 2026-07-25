import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"

/**
 * POST /api/galvelica/<workId>/request-inclusion
 * 对未收录的 Galvelica 作品提交「收录到 Circleica」申请（Stage E）。
 * 游客也可提交（requestedBy 为空）；已收录或已有 Pending 申请则返回 409。
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
    return NextResponse.json({ error: "该作品已被 Circleica 收录", alreadyIncluded: true }, { status: 409 })
  }

  const existing = await prisma.inclusionRequest.findFirst({
    where: { workId: id, status: "PENDING" },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: "已提交收录申请，等待审核" }, { status: 409 })
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

  try {
    await prisma.inclusionRequest.create({
      data: { workId: id, requestedBy: userId, note, status: "PENDING" },
    })
  } catch (e) {
    logger.api.error("[request-inclusion] create failed", e)
    return NextResponse.json({ error: "提交失败" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
