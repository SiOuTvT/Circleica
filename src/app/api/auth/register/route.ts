import { badRequest, conflict, created, handleZodError, serverError } from "@/lib/api-response"
import { logger } from "@/lib/logger"
import { withRateLimit } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
import { rateLimits } from "@/lib/rate-limit"
import { serialIdToUid } from "@/lib/serial-id"
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

    // 第一个注册的用户自动成为站长
    const userCount = await prisma.user.count()
    const role = userCount === 0 ? "SUPER_ADMIN" : "USER"

    const user = await prisma.user.create({
      data: { username, email, password: hashed, role },
      select: { id: true, serialId: true, username: true, email: true },
    })

    // 根据 serialId 生成零填充 UID 并回写
    const uid = serialIdToUid(user.serialId)
    await prisma.user.update({
      where: { id: user.id },
      data: { uid },
    })

    return created({ id: user.id, username: user.username, email: user.email, uid })
  } catch (error) {
    logger.auth.error("Registration error", error)
    return serverError("注册失败，请稍后再试")
  }
}

export const POST = (req: NextRequest) =>
  withRateLimit(handleRegister, rateLimits.register, "register")(req)