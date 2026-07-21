import { withHandler, json, safeParseJson } from '@/lib/api-handler'
import { authService } from '@/services/user'
import { auth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { RateLimitError, ValidationError } from '@/lib/errors'

// POST — 请求修改邮箱（需登录 + 当前密码）
export const POST = withHandler(async (req) => {
  const rl = await checkRateLimit({ windowMs: 3600_000, maxRequests: 3, message: "邮箱修改请求过于频繁" })
  if (!rl.success) throw new RateLimitError("邮箱修改请求过于频繁，请稍后再试", rl.reset)

  const session = await auth()
  if (!session?.user?.id) throw new ValidationError("请先登录")

  const { newEmail, currentPassword } = await safeParseJson(req)
  const result = await authService.requestEmailChange(session.user.id, newEmail, currentPassword)
  return json(result)
})

// GET — 确认邮箱修改（用户点击验证链接）
export const GET = withHandler(async (req) => {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) throw new ValidationError("缺少验证令牌")

  const result = await authService.confirmEmailChange(token)
  return json(result)
})
