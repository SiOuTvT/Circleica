import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "无权限" }, { status: 403 })

  try {
    const body = await req.json()
    const { vndbId, name } = body

    if (!vndbId || !name) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // Upsert: 存在就跳过，不存在就创建
    let creator = await prisma.creator.findFirst({ where: { vndbId: String(vndbId) } })
    if (!creator) {
      creator = await prisma.creator.create({
        data: {
          vndbId: String(vndbId),
          name: String(name),
          nameJa: body.nameJa || body.original || "",
          bio: body.description || body.bio || "",
          gender: body.gender || "",
          twitterUrl: body.twitterUrl || "",
          wikipediaUrl: body.wikipediaUrl || "",
        },
      })
    }

    return NextResponse.json({ ok: true, id: creator.id })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}