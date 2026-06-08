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
  const { name, nameJa, avatar, bio, gender, twitterUrl, wikipediaUrl, vndbId } = body

  if (!name?.trim()) return NextResponse.json({ error: "名字不能为空" }, { status: 400 })

  const creator = await prisma.creator.update({
    where: { id },
    data: {
      vndbId:      vndbId?.trim() ?? "",
      name:        name.trim(),
      nameJa:      nameJa?.trim() ?? "",
      avatar:      avatar?.trim() ?? "",
      bio:         bio?.trim() ?? "",
      gender:      gender ?? "",
      twitterUrl:  twitterUrl?.trim() ?? "",
      wikipediaUrl: wikipediaUrl?.trim() ?? "",
    },
  })
  return NextResponse.json(creator)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  await prisma.creator.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
