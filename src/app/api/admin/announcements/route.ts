import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { announcementService } from "@/services/announcement"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"
import type { NextRequest } from "next/server"

/**
 * GET /api/admin/announcements
 * - admin=true → 管理员全量列表
 * - 默认 → 最新 1 条（公开）
 */
export const GET = withHandler(async (req: NextRequest) => {
  const isAdmin = req.nextUrl.searchParams.get("admin") === "true"

  if (isAdmin) {
    await requireAdminRole()
    const data = await announcementService.getAll()
    return json(data)
  }

  const data = await announcementService.getPublished(1)
  return json(data)
})

/**
 * POST /api/admin/announcements
 * 创建公告（管理员）
 */
export const POST = withHandler(async (req: NextRequest) => {
  const ctx = await requireAdminRole()
  const body = await safeParseJson(req)
  const data = await announcementService.create(body, ctx)

  await logAudit({
    userId: "ADMIN",
    action: "announcement.create",
    target: data.id,
    detail: `新建公告《${data.title}》（${data.status === "published" ? "已发布" : "草稿"}）`,
  }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))

  return created(data)
})
