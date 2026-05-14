import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const limit = 20
  const skip = (page - 1) * limit

  const [reports, total] = await Promise.all([
    prisma.gameReport.findMany({
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: {
        game: { select: { id: true, title: true, coverImage: true } },
      },
    }),
    prisma.gameReport.count(),
  ])

  return NextResponse.json({ reports, total, page, limit })
}

export async function DELETE(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 })

  await prisma.gameReport.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}