import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { reportService } from "@/services/admin"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"
import { NotFoundError } from "@/lib/errors"

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
    // 先确认游戏存在：不存在就别假装成功，也别留下「《未知游戏》解除 0 条举报」这种脏记录
    const game = await prisma.game.findUnique({ where: { id: body.gameId }, select: { title: true } })
    if (!game) throw new NotFoundError("游戏")

    // 解决：删除该游戏的所有举报
    const { count } = await prisma.gameReport.deleteMany({ where: { gameId: body.gameId } })
    // 一条都没删掉 → 没有实际处置动作，不该留下审计记录
    if (count === 0) return json({ count: 0 })

    // 同步清掉资源上的被举报标记：该游戏下「已无任何 ResourceReport」的资源一律重置，
    // 用关系过滤一次 updateMany 搞定，不逐条查。否则 isReported 永远消不掉。
    await prisma.gameResource.updateMany({
      where: { gameId: body.gameId, isReported: true, reports: { none: {} } },
      data: { isReported: false, reportedAt: null },
    })
    await logAudit({
      userId: "ADMIN",
      action: "report.resolve",
      target: String(body.gameId),
      detail: `《${game.title}》解除 ${count} 条举报`,
    }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return noContent()
  }

  if (body.id) {
    // 删除单条举报：先查再删，避免用 catch 兜底另一张表
    // （gameReport.delete 因网络等非 P2025 原因失败时，会误删同 id 的 resourceReport）
    const [gameReport, resourceReport] = await Promise.all([
      prisma.gameReport.findUnique({
        where: { id: body.id },
        // 审计要写人类可读的详情，顺带把 ip / reason / 游戏标题一次查出来
        select: {
          id: true, ip: true, reason: true,
          game: { select: { title: true } },
        },
      }),
      prisma.resourceReport.findUnique({ where: { id: body.id }, select: { id: true, resourceId: true } }),
    ])
    if (gameReport) {
      await prisma.gameReport.delete({ where: { id: body.id } })
      // 与资源举报那一路同风格：写名字而不是裸 cuid；没填理由就省掉理由那一段
      const title = gameReport.game?.title ?? "未知游戏"
      const reason = gameReport.reason?.trim()
      await logAudit({
        userId: "ADMIN",
        action: "report.delete",
        target: String(body.id),
        detail: reason
          ? `删除《${title}》的一条举报（IP ${gameReport.ip}，理由「${reason}」）`
          : `删除《${title}》的一条举报（IP ${gameReport.ip}）`,
      }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
      return noContent()
    }

    if (resourceReport) {
      await prisma.resourceReport.delete({ where: { id: body.id } })
      // 该资源已无剩余举报 → 清掉标记，否则后台那面 Flag 永远亮着
      const remaining = await prisma.resourceReport.count({ where: { resourceId: resourceReport.resourceId } })
      if (remaining === 0) {
        await prisma.gameResource.updateMany({
          where: { id: resourceReport.resourceId, isReported: true },
          data: { isReported: false, reportedAt: null },
        })
      }
      const resource = await prisma.gameResource.findUnique({
        where: { id: resourceReport.resourceId },
        select: { resourceName: true },
      })
      await logAudit({
        userId: "ADMIN",
        action: "report.delete",
        target: String(body.id),
        // 查不到资源时不报错，名字退回资源 id
        detail: `资源「${resource?.resourceName || resourceReport.resourceId}」举报已处理，标记已清除`,
      }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
      return noContent()
    }

    // 两张表都没命中：不能静默返回成功，否则前端提示「已删除」而库里什么都没变
    throw new NotFoundError("举报记录")
  }
  return noContent()
})
