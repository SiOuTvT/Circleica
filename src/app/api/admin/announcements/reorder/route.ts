import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { announcementService } from "@/services/announcement"
import { ValidationError } from "@/lib/errors"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import type { NextRequest } from "next/server"

/**
 * POST /api/admin/announcements/reorder
 * 批量更新公告排序（管理员）
 */
export const POST = withHandler(async (req: NextRequest) => {
  await requireAdminRole()
  const { orderedIds } = await safeParseJson(req)

  if (!Array.isArray(orderedIds)) {
    throw new ValidationError("orderedIds 必须是数组")
  }

  const items = orderedIds.map((id: string, index: number) => ({
    id,
    sortOrder: index,
  }))

  await announcementService.reorder(items)

  // 审计：按顺序列出标题，最多 6 个，超出写「…共 N 条」
  const ids = orderedIds as string[]
  const rows = await prisma.announcement.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true },
  })
  const titleMap = new Map(rows.map((r) => [r.id, r.title]))
  const titles = ids.map((id) => titleMap.get(id) ?? id)
  const shown = titles.slice(0, 6).join(", ")
  await logAudit({
    userId: "ADMIN",
    action: "announcement.reorder",
    target: ids.join(","),
    detail: titles.length > 6 ? `公告改序：${shown} …共 ${titles.length} 条` : `公告改序：${shown}`,
  }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))

  return json({ success: true })
})
