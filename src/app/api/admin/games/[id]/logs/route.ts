import { withHandler, json, created } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminGameService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  return json(await adminGameService.getLogs(id))
})

export const POST = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const { content } = await req.json()
  return created(await adminGameService.createLog(id, content))
})
