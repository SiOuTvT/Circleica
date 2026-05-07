import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin"

// 公开接口 - 获取最新公告（用于导航栏显示）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isAdmin = searchParams.get('admin') === 'true'
  
  // 如果是管理员请求或需要完整列表，检查权限
  if (isAdmin) {
    if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  }
  
  // 默认只返回最新的1条公告（公开）
  const limit = isAdmin ? undefined : 1
  const anns = await prisma.announcement.findMany({ 
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      content: true,
      link: true,
      createdAt: true,
    }
  })
  return NextResponse.json(anns)
}

export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { title, content, link } = await req.json()
  if (!title?.trim() || !content?.trim()) return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 })
  const ann = await prisma.announcement.create({
    data: { title: title.trim(), content: content.trim(), link: link?.trim() ?? "" },
  })
  return NextResponse.json(ann, { status: 201 })
}
