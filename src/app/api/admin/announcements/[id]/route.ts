import { withHandler, json, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { announcementService } from "@/services/announcement"
import type { NextRequest } from "next/server"

/**
 * PUT /api/admin/announcements/[id]
 * 更新公告（管理员）
 */
export const PUT = withHandler(async (req: NextRequest, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const body = await req.json()
  const data = await announcementService.update(id, body)
  return json(data)
})

/**
 * DELETE /api/admin/announcements/[id]
 * 删除公告（管理员）
 */
export const DELETE = withHandler(async (_req: NextRequest, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  await announcementService.delete(id)
  return noContent()
})
