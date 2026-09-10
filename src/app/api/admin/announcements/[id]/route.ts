import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { announcementService } from "@/services/announcement"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import type { NextRequest } from "next/server"

/** 公告状态中文名：审计 detail 里不裸写枚举值 */
const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  published: "已发布",
  hidden: "已隐藏",
}

/** 参与「是否变化」比对的字段 */
const DIFF_FIELDS = [
  "title", "summary", "content", "imageUrl", "link",
  "status", "isPinned", "isActive", "startAt", "endAt", "sortOrder",
] as const

/** 只列真正变化的字段；status 用中文写过渡值；完全无变化时写「无字段变化」 */
function buildUpdateDetail(before: unknown, after: unknown): string {
  const b = before as Record<string, unknown>
  const a = after as Record<string, unknown>
  const changed: string[] = []
  for (const f of DIFF_FIELDS) {
    if (JSON.stringify(b[f]) === JSON.stringify(a[f])) continue
    if (f === "status") {
      const from = STATUS_LABELS[String(b[f])] ?? String(b[f])
      const to = STATUS_LABELS[String(a[f])] ?? String(a[f])
      changed.push(`status:${from}→${to}`)
    } else {
      changed.push(f)
    }
  }
  return `《${String(a.title ?? "")}》${changed.length > 0 ? `fields=${changed.join(",")}` : "无字段变化"}`
}

/**
 * PUT /api/admin/announcements/[id]
 * 更新公告（管理员）
 */
export const PUT = withHandler(async (req: NextRequest, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  // 取改前原值用于审计 diff
  const before = await prisma.announcement.findUnique({ where: { id } })
  const data = await announcementService.update(id, body)

  if (before) {
    await logAudit({
      userId: "ADMIN",
      action: "announcement.update",
      target: id,
      detail: buildUpdateDetail(before, data),
    }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
  }

  return json(data)
})

/**
 * DELETE /api/admin/announcements/[id]
 * 删除公告（管理员）
 */
export const DELETE = withHandler(async (_req: NextRequest, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  // 先取标题再删，否则删完就取不到了
  const before = await prisma.announcement.findUnique({ where: { id }, select: { id: true, title: true } })
  await announcementService.delete(id)

  if (before) {
    await logAudit({
      userId: "ADMIN",
      action: "announcement.delete",
      target: id,
      detail: `删除公告《${before.title}》`,
    }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
  }

  return noContent()
})
