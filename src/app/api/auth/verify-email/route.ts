import { withHandler, json } from '@/lib/api-handler'
import { authService } from '@/services/user'
import { auth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { RateLimitError, ValidationError } from '@/lib/errors'

// POST — 发送验证邮件（需登录）
export const POST = withHandler(async (_req) => {
  const rl = await checkRateLimit({ windowMs: 300_000, maxRequests: 5, message: "验证邮件发送过于频繁，请稍后再试" })
  if (!rl.success) throw new RateLimitError("验证邮件发送过于频繁，请稍后再试", rl.reset)

  const session = await auth()
  if (!session?.user?.id) throw new ValidationError("请先登录")

  const result = await authService.sendVerificationEmail(session.user.id)
  return json(result)
})

// GET — 验证邮箱（用户点击邮件链接）
export const GET = withHandler(async (req) => {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) throw new ValidationError("缺少验证令牌")

  const result = await authService.verifyEmail(token)
  return json(result)
})
