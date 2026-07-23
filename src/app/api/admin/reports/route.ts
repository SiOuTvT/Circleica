import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { reportService } from "@/services/admin"
import { prisma } from "@/lib/prisma"

export const GET = withHandler(async () => {
  await requireAdminRole()
  const [gameReports, resourceReports] = await Promise.all([
    reportService.getGameReports(),
    reportService.getResourceReports(),
  ])
  return json({ gameReports, resourceReports })
})

export const DELETE = withHandler(async (req) => {
  await requireAdminRole()
  const body = await safeParseJson(req)
  if (body.gameId) {
    // 解决：删除该游戏的所有举报
    await prisma.gameReport.deleteMany({ where: { gameId: body.gameId } })
  } else if (body.id) {
    // 删除单条举报
    await prisma.gameReport.delete({ where: { id: body.id } }).catch(() => {
      return prisma.resourceReport.delete({ where: { id: body.id } })
    })
  }
  return noContent()
})
