import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin"
import bcrypt from "bcryptjs"
import crypto from "crypto"

type Ctx = { params: Promise<{ id: string }> }

// 重置密码 + 切换角色
export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  const { newPassword, role } = await req.json()

  const data: Record<string, string> = {}
  if (role) {
    // 验证角色值是否合法
    const validRoles = ["USER", "ADMIN", "SUPER_ADMIN"]
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "无效的角色值" }, { status: 400 })
    }
    // 防止降级站长
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (targetUser?.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "不能修改站长角色" }, { status: 403 })
    }
    data.role = role
  }
  if (newPassword) {
    if (newPassword.length < 6) return NextResponse.json({ error: "密码至少6位" }, { status: 400 })
    data.password = await bcrypt.hash(newPassword, 10)
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "无更新内容" }, { status: 400 })

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, role: true },
  })
  return NextResponse.json(user)
}

// 管理员为指定用户生成重置链接
export async function POST(_req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } })
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 })

  await prisma.passwordResetToken.deleteMany({ where: { userId: id } })

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.passwordResetToken.create({ data: { userId: id, token, expiresAt } })

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  return NextResponse.json({ resetUrl, expiresAt: expiresAt.toISOString() })
}
