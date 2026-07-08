import { withHandler, json, created } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { achievementService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async () => {
  await requireAdminRole("SUPER_ADMIN")
  return json(await achievementService.getAll())
})

export const POST = withHandler(async (req: NextRequest) => {
  await requireAdminRole("SUPER_ADMIN")
  const body = await req.json()
  return created(await achievementService.create(body))
})
