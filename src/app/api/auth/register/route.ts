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
      const maskedEmail = email.replace(/(.{2}).*(@.*)/, "$1***$2")
      logger.auth.warn("Registration attempt with duplicate account", { username, email: maskedEmail })
      return conflict("用户名或邮箱已被使用")
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