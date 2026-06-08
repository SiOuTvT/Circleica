import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

/** GET: 列表（支持 ?category=toast|empty|error|success 筛选） */
export async function GET(req: NextRequest) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const category = req.nextUrl.searchParams.get("category")
  const where = category ? { category } : {}
  const items = await prisma.emotionalMessage.findMany({
    where,
    orderBy: [{ category: "asc" }, { key: "asc" }],
  })
  return NextResponse.json(items)
}

/** POST: 创建新的情感化消息 */
export async function POST(req: NextRequest) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  const { key, category, title, subtitle, imageUrl, emoji, enabled } = body
  if (!key || !category) {
    return NextResponse.json({ error: "key 和 category 为必填项" }, { status: 400 })
  }
  const existing = await prisma.emotionalMessage.findUnique({ where: { key } })
  if (existing) {
    return NextResponse.json({ error: `key "${key}" 已存在` }, { status: 409 })
  }
  const item = await prisma.emotionalMessage.create({
    data: { key, category, title: title || "", subtitle: subtitle || "", imageUrl: imageUrl || "", emoji: emoji || "", enabled: enabled !== false },
  })
  return NextResponse.json(item, { status: 201 })
}