import { ensureEmotionalMessages } from "@/lib/ensure-emotional-messages"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

/** GET: 公共接口，返回已启用的情感消息（支持 ?category= 和 ?key= 查询） */
export async function GET(req: NextRequest) {
  // 确保预设情感消息存在（首次访问时自动创建）
  await ensureEmotionalMessages()
  const category = req.nextUrl.searchParams.get("category")
  const key = req.nextUrl.searchParams.get("key")

  if (key) {
    const item = await prisma.emotionalMessage.findFirst({ where: { key, enabled: true } })
    if (!item) return NextResponse.json(null)
    return NextResponse.json(item)
  }

  const where: Record<string, unknown> = { enabled: true }
  if (category) where.category = category

  const items = await prisma.emotionalMessage.findMany({
    where,
    orderBy: [{ category: "asc" }, { key: "asc" }],
  })
  return NextResponse.json(items)
}