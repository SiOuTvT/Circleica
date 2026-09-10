import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { formatDateTime } from "@/lib/date"
import { Pagination } from "@/components/ui/pagination"
import { Card } from "@/components/ui/card"
import { AdminPageContainer } from "@/components/admin-page-container"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { FileText } from "lucide-react"

export const metadata = { title: "审计日志" }

// 审计日志 action → 中文标签。覆盖 src/services/admin/*.ts 与 /api/admin/services 的全部 action。
// 未被此表收录的 action 会原样显示英文 key（不会误翻）。
const ACTION_LABELS: Record<string, string> = {
  // ── 历史键（保留，旧数据仍在用，勿删）──
  approve_game: "通过审核",
  reject_game: "拒回游戏",
  delete_forum_post: "删除论坛帖",
  update_user: "修改用户",

  // ── 游戏 ──
  "game.create": "新增游戏",
  "game.update": "修改游戏",
  "game.delete": "删除游戏",
  "game.batchDelete": "批量删除游戏",
  "review.approve": "审核通过",
  "review.reject": "审核驳回",

  // ── 用户 ──
  "user.updateRole": "修改用户角色",
  "user.delete": "删除用户",

  // ── 标签 ──
  "tagGroup.create": "新增标签组",
  "tagGroup.update": "修改标签组",
  "tagGroup.delete": "删除标签组",
  "tag.create": "新增标签",
  "tag.update": "修改标签",
  "tag.delete": "删除标签",
  "tag.assignGroup": "分配标签分组",

  // ── 音乐 / 歌单 ──
  "music.create": "新增音乐",
  "music.update": "修改音乐",
  "music.delete": "删除音乐",
  "playlist.create": "新增歌单",
  "playlist.update": "修改歌单",
  "playlist.delete": "删除歌单",

  // ── 内容 ──
  "achievement.create": "新增成就",
  "achievement.update": "修改成就",
  "achievement.delete": "删除成就",
  "avatarFrame.create": "新增头像框",
  "avatarFrame.update": "修改头像框",
  "avatarFrame.delete": "删除头像框",
  "creator.create": "新增创作者",
  "creator.update": "修改创作者",
  "creator.delete": "删除创作者",
  "emotionalMessage.create": "新增情感文案",
  "emotionalMessage.update": "修改情感文案",
  "emotionalMessage.delete": "删除情感文案",

  // ── 社区 ──
  "forum.deletePost": "删除论坛帖子",
  "favorite.delete": "删除收藏",
  "follow.delete": "删除关注",

  // ── 精选合集 ──
  "collection.create": "新建合集",
  "collection.update": "更新合集",
  "collection.delete": "删除合集",

  // ── 公告 ──
  "announcement.create": "新建公告",
  "announcement.update": "更新公告",
  "announcement.delete": "删除公告",
  "announcement.reorder": "公告改序",

  // ── 副站作品 ──
  "work.coverReview": "标定封面分级",

  // ── 收录申请 ──
  "inclusion.publish": "发布收录草稿",
  "inclusion.deleteDraft": "删除收录草稿",

  // ── 资源 / 举报 ──
  "resource.delete": "删除游戏资源",
  "report.resolve": "处理游戏举报",
  "report.delete": "删除举报",

  // ── 运维 ──
  ADMIN_SERVICE_CONFIG_SAVE: "保存服务配置",
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const action = sp.action || ""
  const limit = 30
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (action) where.action = action

  // 优化：并发查询日志列表和 distinct actions
  const [logs, total, distinctActions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: { user: { select: { id: true, username: true, avatar: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <AdminPageContainer
      eyebrow="AUDIT LOGS"
      title="审计日志"
      description={
        <Badge variant="secondary" size="lg">{total} 条记录</Badge>
      }
    >

      {/* Filter tabs */}
      {distinctActions.length > 0 && (
        <div className="flex flex-wrap items-end gap-4">
          <a href="/admin/audit-logs"
            className={`inline-flex items-center px-1 pb-2.5 text-sm font-medium transition duration-150 ease-in-out ${!action ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"}`}>
            全部
          </a>
          {distinctActions.map(({ action: a }) => (
            <a key={a} href={`/admin/audit-logs?action=${a}`}
              className={`inline-flex items-center px-1 pb-2.5 text-sm font-medium transition duration-150 ease-in-out ${action === a ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"}`}>
              {ACTION_LABELS[a] ?? a}
            </a>
          ))}
        </div>
      )}

      {logs.length === 0 ? (
        <EmptyState icon={FileText} title="暂无日志记录" bordered />
      ) : (
        <div className="space-y-1">
          {logs.map(log => (
            <Card key={log.id} size="default" radius="xl" className="flex-row items-center gap-4 hover:ring-primary/20">
              <div className="h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                {log.user.username?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{log.user.username}</span>
                  <Badge variant="secondary" size="lg">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </Badge>
                  {log.target && (
                    <span className="text-micro text-muted-foreground/50 font-mono truncate">{log.target.slice(0, 16)}</span>
                  )}
                </div>
                {log.detail && (
                  <p className="text-xs text-muted-foreground truncate">{log.detail}</p>
                )}
              </div>
              <span className="text-micro text-muted-foreground shrink-0 whitespace-nowrap">
                {formatDateTime(log.createdAt)}
              </span>
            </Card>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} baseUrl="/admin/audit-logs" extraParams={action ? { action } : undefined} />
    </AdminPageContainer>
  )
}
