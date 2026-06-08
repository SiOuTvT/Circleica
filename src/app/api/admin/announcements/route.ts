import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

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
    orderBy: { sortOrder: "asc" },
    take: limit,
    select: {
      id: true,
      title: true,
      content: true,
      imageUrl: true,
      link: true,
      createdAt: true,
      ...(isAdmin ? { sortOrder: true, isActive: true } : {}),
    }
  })
  return NextResponse.json(anns)
}

export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  let title: string | undefined, content: string | undefined, imageUrl: string | undefined, link: string | undefined
  try {
    const body = await req.json()
    title = body.title as string | undefined
    content = body.content as string | undefined
    imageUrl = body.imageUrl as string | undefined
    link = body.link as string | undefined
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  if (!title?.trim() || !content?.trim()) return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 })
  const ann = await prisma.announcement.create({
    data: { title: title.trim(), content: content.trim(), imageUrl: imageUrl?.trim() ?? "", link: link?.trim() ?? "" },
  })
  return NextResponse.json(ann, { status: 201 })
}
