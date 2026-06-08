import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin"

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }

  // 支持 toggle isActive 或完整更新
  const data: Record<string, unknown> = {}
  if ("isActive" in body) data.isActive = body.isActive
  if (body.title) data.title = (body.title as string).trim()
  if (body.content) data.content = (body.content as string).trim()
  if ("imageUrl" in body) data.imageUrl = (body.imageUrl as string)?.trim() ?? ""
  if ("link" in body) data.link = (body.link as string)?.trim() ?? ""

  const ann = await prisma.announcement.update({ where: { id }, data })
  return NextResponse.json(ann)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  await prisma.announcement.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
