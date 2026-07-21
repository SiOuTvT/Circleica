import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { avatarFrameService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async () => {
  await requireAdminRole("SUPER_ADMIN")
  return json({ frames: await avatarFrameService.getAll() })
})

export const POST = withHandler(async (req: NextRequest) => {
  await requireAdminRole("SUPER_ADMIN")
  const body = await safeParseJson(req)
  return created({ frame: await avatarFrameService.create(body) })
})
