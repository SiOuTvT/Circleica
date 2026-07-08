import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { creatorService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdminRole()
  const vndbId = req.nextUrl.searchParams.get("id")
  return json(await creatorService.fetchFromVndb(vndbId || ""))
})
