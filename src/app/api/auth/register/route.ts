import { withHandler, created, safeParseJson } from '@/lib/api-handler'
import { authService } from '@/services/user'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'

export const POST = withHandler(async (req) => {
  const rl = await checkRateLimit(rateLimits.register)
  if (!rl.success) throw new RateLimitError("注册次数过多，请稍后再试", rl.reset)

  const body = await safeParseJson(req)
  const user = await authService.register(body)
  const { password: _, ...userWithoutPassword } = user
  return created(userWithoutPassword)
})
