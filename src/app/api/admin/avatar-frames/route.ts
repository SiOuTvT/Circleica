import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET: 获取所有头像框（管理员）
export async function GET() {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const frames = await prisma.avatarFrame.findMany({
    orderBy: { sort: "asc" },
  })

  return NextResponse.json({ frames })
}

// POST: 创建新头像框
export async function POST(request: Request) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  try {
    const body = await request.json()
    const { name, description, imageUrl, isPublic, sort } = body

    if (!name || !imageUrl) {
      return NextResponse.json({ error: "名称和图片 URL 必填" }, { status: 400 })
    }

    const frame = await prisma.avatarFrame.create({
      data: {
        name,
        description: description || "",
        imageUrl,
        isPublic: isPublic !== false,
        sort: sort || 0,
      },
    })

    return NextResponse.json({ frame }, { status: 201 })
  } catch (error) {
    console.error("创建头像框失败:", error)
    return NextResponse.json({ error: "创建失败" }, { status: 500 })
  }
}
