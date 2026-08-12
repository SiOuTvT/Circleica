import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-context"
import { recordView, type TargetType } from "@/lib/view-history"
import { prisma } from "@/lib/prisma"

// 记录一次浏览（继续浏览）。客户端在作品/游戏详情挂载时调用。
export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json().catch(() => ({}))
    const targetType = String(body?.targetType || "")
    const targetId = String(body?.targetId || "")
    if ((targetType !== "GAME" && targetType !== "WORK") || !targetId) {
      return NextResponse.json({ ok: false, error: "invalid params" }, { status: 400 })
    }
    await recordView(auth.userId, targetType as TargetType, targetId)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 })
  }
}

// 清空当前用户全部浏览历史
export async function DELETE() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  try {
    await prisma.$executeRaw`DELETE FROM "ViewHistory" WHERE "userId" = ${auth.userId}`
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 })
  }
}
