import { withHandler, json } from '@/lib/api-handler'
import { authService } from '@/services/user'

export const POST = withHandler(async (req) => {
  const { email } = await req.json()
  const result = await authService.forgotPassword(email)
  return json(result)
})
