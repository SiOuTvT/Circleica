import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

/** PUT: 更新 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  try {
    const body = await req.json()
    const { title, subtitle, imageUrl, emoji, enabled, category } = body
    const item = await prisma.emotionalMessage.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(subtitle !== undefined && { subtitle }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(emoji !== undefined && { emoji }),
        ...(enabled !== undefined && { enabled }),
        ...(category !== undefined && { category }),
      },
    })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 })
  }
}

/** DELETE: 删除 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  try {
    await prisma.emotionalMessage.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 })
  }
}