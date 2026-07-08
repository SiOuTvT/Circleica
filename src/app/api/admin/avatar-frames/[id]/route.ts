import { withHandler, json, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { avatarFrameService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  await requireAdminRole("SUPER_ADMIN")
  const { id } = await ctx!.params
  return json({ frame: await avatarFrameService.getById(id) })
})

export const PUT = withHandler(async (req: NextRequest, ctx) => {
  await requireAdminRole("SUPER_ADMIN")
  const { id } = await ctx!.params
  const body = await req.json()
  return json({ frame: await avatarFrameService.update(id, body) })
})

export const DELETE = withHandler(async (_req: NextRequest, ctx) => {
  await requireAdminRole("SUPER_ADMIN")
  const { id } = await ctx!.params
  await avatarFrameService.delete(id)
  return noContent()
})
