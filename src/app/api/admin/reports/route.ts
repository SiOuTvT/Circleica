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
    // 删除单条举报：先查再删，避免用 catch 兜底另一张表
    // （gameReport.delete 因网络等非 P2025 原因失败时，会误删同 id 的 resourceReport）
    const [gameReport, resourceReport] = await Promise.all([
      prisma.gameReport.findUnique({ where: { id: body.id }, select: { id: true } }),
      prisma.resourceReport.findUnique({ where: { id: body.id }, select: { id: true } }),
    ])
    if (gameReport) {
      await prisma.gameReport.delete({ where: { id: body.id } })
    } else if (resourceReport) {
      await prisma.resourceReport.delete({ where: { id: body.id } })
    }
  }
  return noContent()
})
