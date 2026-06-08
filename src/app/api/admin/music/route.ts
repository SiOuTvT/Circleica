import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin"

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const music = await prisma.music.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(music)
}

export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  let title: string | undefined, url: string | undefined
  try {
    const body = await req.json()
    title = body.title as string | undefined
    url = body.url as string | undefined
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  if (!title?.trim() || !url?.trim()) return NextResponse.json({ error: "标题和链接不能为空" }, { status: 400 })

  const music = await prisma.music.create({
    data: { title: title.trim(), filename: url.trim(), url: url.trim() },
  })
  return NextResponse.json(music, { status: 201 })
}
