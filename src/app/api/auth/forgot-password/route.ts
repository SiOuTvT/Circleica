import { withHandler, json, safeParseJson } from '@/lib/api-handler'
import { authService } from '@/services/user'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'

export const POST = withHandler(async (req) => {
  const rl = await checkRateLimit(rateLimits.passwordReset)
  if (!rl.success) throw new RateLimitError("密码重置请求过多，请稍后再试", rl.reset)

  const { email } = await safeParseJson(req)
  const result = await authService.forgotPassword(email)
  return json(result)
})
