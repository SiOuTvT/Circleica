import { badRequest, conflict, created, handleZodError, serverError } from "@/lib/api-response"
import { logger } from "@/lib/logger"
import { withRateLimit } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
import { rateLimits } from "@/lib/rate-limit"
import { parseBody, registerSchema } from "@/lib/validations"
import bcrypt from "bcryptjs"
import { NextRequest } from "next/server"

async function handleRegister(req: NextRequest) {
  const parsed = await parseBody(req, registerSchema)
  if (!parsed.success) {
    if (parsed.error) return handleZodError(parsed.error)
    return badRequest(parsed.message)
  }

  const { username, email, password } = parsed.data

  try {
    const exists = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    })
    if (exists) {
      const field = exists.username === username ? "用户名" : "邮箱"
      logger.auth.warn(`Registration attempt with duplicate ${field}`, { username, email })
      return conflict(`${field}已被占用`)
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { username, email, password: hashed },
      select: { id: true, username: true, email: true },
    })

    return created(user)
  } catch (error) {
    logger.auth.error("Registration error", error)
    return serverError("注册失败，请稍后再试")
  }
}

export const POST = (req: NextRequest) =>
  withRateLimit(handleRegister, rateLimits.register, "register")(req)