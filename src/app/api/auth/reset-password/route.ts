import { withHandler, json, safeParseJson } from '@/lib/api-handler'
import { authService } from '@/services/user'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'

export const POST = withHandler(async (req) => {
  const rl = await checkRateLimit(rateLimits.passwordReset)
  if (!rl.success) throw new RateLimitError("请求过于频繁，请稍后再试", rl.reset)

  const { token, password } = await safeParseJson(req)
  const result = await authService.resetPassword(token, password)
  return json(result)
})
