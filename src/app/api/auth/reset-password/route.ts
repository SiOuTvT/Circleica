import { withHandler, json } from '@/lib/api-handler'
import { authService } from '@/services/user'

export const POST = withHandler(async (req) => {
  const { token, password } = await req.json()
  const result = await authService.resetPassword(token, password)
  return json(result)
})
