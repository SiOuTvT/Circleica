import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

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

  if (!username || !email || !password)
    return NextResponse.json({ error: "请填写所有必填项" }, { status: 400 })
  if (password.length < 6)
    return NextResponse.json({ error: "密码至少6位" }, { status: 400 })

  const exists = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  })
  if (exists) {
    const field = exists.username === username ? "用户名" : "邮箱"
    return NextResponse.json({ error: `${field}已被占用` }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username, email, password: hashed },
    select: { id: true, username: true, email: true },
  })

  return NextResponse.json(user, { 
    status: 201,
    headers: {
      "X-RateLimit-Limit": String(rateLimit.limit),
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": String(rateLimit.reset),
    },
  })
}
