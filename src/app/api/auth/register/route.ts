import { withHandler, created } from '@/lib/api-handler'
import { authService } from '@/services/user'

export const POST = withHandler(async (req) => {
  const body = await req.json()
  const user = await authService.register(body)
  const { password: _, ...userWithoutPassword } = user
  return created(userWithoutPassword)
})
