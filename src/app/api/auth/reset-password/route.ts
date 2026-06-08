import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  let token: string, password: string
  try {
    const body = await req.json()
    token = body.token
    password = body.password
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  if (!token || !password) return NextResponse.json({ error: "参数缺失" }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: "密码至少6位" }, { status: 400 })

  const record = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!record) return NextResponse.json({ error: "重置链接无效" }, { status: 400 })
  if (record.usedAt) return NextResponse.json({ error: "重置链接已使用" }, { status: 400 })
  if (record.expiresAt < new Date()) return NextResponse.json({ error: "重置链接已过期，请重新申请" }, { status: 400 })

  const hashed = await bcrypt.hash(password, 10)

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ])

  return NextResponse.json({ ok: true })
}

// GET：验证令牌是否有效（页面加载时调用）
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) return NextResponse.json({ valid: false })

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { email: true } } },
  })

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ valid: false })
  }

  return NextResponse.json({ valid: true, email: record.user.email })
}
