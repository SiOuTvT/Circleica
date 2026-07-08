import { withHandler, json, created } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { announcementService } from "@/services/announcement"
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

  const data = await announcementService.getLatest(1)
  return json(data)
})

/**
 * POST /api/admin/announcements
 * 创建公告（管理员）
 */
export const POST = withHandler(async (req: NextRequest) => {
  const ctx = await requireAdminRole()
  const body = await req.json()
  const data = await announcementService.create(body, ctx)
  return created(data)
})
