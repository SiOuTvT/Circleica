import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-context"
import { recordView, type TargetType } from "@/lib/view-history"
import { prisma } from "@/lib/prisma"
import { withHandler } from "@/lib/api-handler"

// 记录一次浏览（继续浏览）。客户端在作品/游戏详情挂载时调用。
// 用 withHandler 统一错误处理：requireAuth() 未登录会抛 UnauthorizedError(401)，
// 若不加包装会以未捕获异常冒泡成 500（审计曾捕获到此缺陷）；包装后返回规范 401。
export const POST = withHandler(async (req) => {
  const auth = await requireAuth()
  const body = await req.json().catch(() => ({}))
  const targetType = String(body?.targetType || "")
  const targetId = String(body?.targetId || "")
  if ((targetType !== "GAME" && targetType !== "WORK") || !targetId) {
    return NextResponse.json({ ok: false, error: "invalid params" }, { status: 400 })
  }
  await recordView(auth.userId, targetType as TargetType, targetId)
  return NextResponse.json({ ok: true })
})

// 清空当前用户全部浏览历史
export const DELETE = withHandler(async () => {
  const auth = await requireAuth()
  await prisma.$executeRaw`DELETE FROM "ViewHistory" WHERE "userId" = ${auth.userId}`
  return NextResponse.json({ ok: true })
})
