import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { auditLogService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdminRole()
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const action = req.nextUrl.searchParams.get("action") || undefined
  const [logs, total] = await auditLogService.getPaginated(page, action)
  return json({
    logs: logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
    total,
    page,
    limit: 30,
    totalPages: Math.ceil(total / 30),
  })
})
