import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

    let username: string, bio: string, avatar: string, oldPassword: string, newPassword: string
    try {
      const body = await req.json()
      username = body.username
      bio = body.bio
      avatar = body.avatar
      oldPassword = body.oldPassword
      newPassword = body.newPassword
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
    }
    if (!username?.trim()) return NextResponse.json({ error: "用户名不能为空" }, { status: 400 })

    const conflict = await prisma.user.findFirst({
      where: { username: username.trim(), id: { not: session.user.id } },
    })
    if (conflict) return NextResponse.json({ error: "用户名已被占用" }, { status: 409 })

    // 修改密码逻辑
    const updateData: Record<string, string> = {
      username: username.trim(),
      bio: bio?.trim() ?? "",
      ...(avatar ? { avatar } : {}),
    }

    if (newPassword) {
      if (!oldPassword) return NextResponse.json({ error: "请输入当前密码" }, { status: 400 })
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } })
      if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 })
      const valid = await bcrypt.compare(oldPassword, user.password)
      if (!valid) return NextResponse.json({ error: "当前密码错误" }, { status: 400 })
      updateData.password = await bcrypt.hash(newPassword, 10)
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { id: true, username: true, avatar: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[Profile Edit]", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
