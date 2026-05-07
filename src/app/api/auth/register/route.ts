import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { withRateLimit } from "@/lib/middleware"
import { rateLimits } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export async function POST(req: NextRequest) {
  // 速率限制：每分钟最多5次注册请求
  const rateLimit = await checkRateLimit(RATE_LIMITS.auth)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.reset),
        },
      }
    )
  }

  const { username, email, password } = await req.json()
async function handleRegister(req: NextRequest) {
  try {
    const { username, email, password } = await req.json()

    if (!username || !email || !password)
      return NextResponse.json({ error: "请填写所有必填项" }, { status: 400 })
    if (password.length < 6)
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 })

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email))
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 })

    // 验证用户名格式（只允许字母、数字、下划线，3-20字符）
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(username))
      return NextResponse.json({ error: "用户名只能包含字母、数字和下划线，长度3-20个字符" }, { status: 400 })

    const exists = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    })
    if (exists) {
      const field = exists.username === username ? "用户名" : "邮箱"
      logger.auth.warn(`Registration attempt with duplicate ${field}`, { username, email })
      return NextResponse.json({ error: `${field}已被占用` }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { username, email, password: hashed },
      select: { id: true, username: true, email: true },
    })

  return NextResponse.json(user, { status: 201 })
}

export const POST = (req: NextRequest) =>
  withRateLimit(handleRegister, rateLimits.register, "register")(req)
