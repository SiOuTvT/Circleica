import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { achievementService } from "@/services/admin"
import { prisma } from "@/lib/prisma"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdminRole("SUPER_ADMIN")
  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
  const pageSize = Math.min(Math.max(1, Number(url.searchParams.get("pageSize")) || 20), 100)
  const search = (url.searchParams.get("search") || "").trim()
  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {}
  const [items, total] = await Promise.all([
    prisma.achievement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.achievement.count({ where }),
  ])
  return json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
})

export const POST = withHandler(async (req: NextRequest) => {
  await requireAdminRole("SUPER_ADMIN")
  const body = await safeParseJson(req)
  return created(await achievementService.create(body))
})
