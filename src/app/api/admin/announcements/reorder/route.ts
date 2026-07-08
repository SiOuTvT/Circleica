import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { announcementService } from "@/services/announcement"
import { ValidationError } from "@/lib/errors"
import type { NextRequest } from "next/server"

/**
 * POST /api/admin/announcements/reorder
 * 批量更新公告排序（管理员）
 */
export const POST = withHandler(async (req: NextRequest) => {
  await requireAdminRole()
  const { orderedIds } = await req.json()

  if (!Array.isArray(orderedIds)) {
    throw new ValidationError("orderedIds 必须是数组")
  }

  const items = orderedIds.map((id: string, index: number) => ({
    id,
    sortOrder: index,
  }))

  await announcementService.reorder(items)
  return json({ success: true })
})
