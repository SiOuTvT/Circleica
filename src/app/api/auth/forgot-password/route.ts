import { withHandler, json, safeParseJson } from '@/lib/api-handler'
import { authService } from '@/services/user'
import { getRateLimit, rateLimits } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'

export const POST = withHandler(async (req) => {
  const { email } = await safeParseJson(req)
  // 按目标邮箱限流，防止攻击者用多 IP 对同一邮箱触发重置邮件轰炸
  const rl = await getRateLimit(`pwreset:${email || "missing"}`, rateLimits.passwordReset)
  if (!rl.allowed) {
    throw new RateLimitError("密码重置请求过多，请稍后再试", Math.max(0, Math.ceil((rl.resetTime - Date.now()) / 1000)))
  }

  const result = await authService.forgotPassword(email)
  return json(result)
})
