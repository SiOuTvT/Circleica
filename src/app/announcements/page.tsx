import type { Metadata } from "next"
import Link from "next/link"

import { ArchiveHero } from "@/components/archive/archive-hero"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export const revalidate = 300

export const metadata: Metadata = {
  title: "公告",
  description: "Circleica 的站务公告与版本更新，按发布时间从新到旧排列。",
  alternates: { canonical: "/announcements" },
}

/** 摘要超 60 字截断（列表只占一行） */
function clip(text: string, max = 60): string {
  const s = text.trim()
  return s.length > max ? `${s.slice(0, max)}…` : s
}

/**
 * 公告列表（/announcements）：前台全量列表。
 * 数据量小、一次给全，不做分页、不做搜索。
 * 口径与首页公告卡一致：status=published + isActive + 落在 startAt/endAt 时间窗内，按发布时间倒序。
 */
export default async function AnnouncementsPage() {
  let items: { id: string; title: string; summary: string; createdAt: Date }[] = []
  try {
    items = await prisma.announcement.findMany({
      where: {
        status: "published",
        isActive: true,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: new Date() } }] },
          { OR: [{ endAt: null }, { endAt: { gte: new Date() } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, summary: true, createdAt: true },
    })
  } catch (error) {
    // 数据库不可用：渲染空态，绝不注入假数据
    logger.db.error("[Announcements] 列表查询失败", error)
  }

  return (
    <div className="space-y-6">
      <ArchiveHero
        variant="announcements"
        eyebrow="announcements"
        title="公告"
        lede="站务公告与版本更新都记在这里，按发布时间从新到旧排列。"
        meta={
          <span>
            共 <span className="tabular-nums text-foreground">{items.length}</span> 条
          </span>
        }
      />

      {items.length === 0 ? (
        <ArchivePlaceholder state="empty" entity="tag" message="暂无公告" />
      ) : (
        <section className="space-y-2">
          {items.map((a) => (
            <Link
              key={a.id}
              href={`/announcements/${a.id}`}
              className="flex min-h-12 items-start gap-4 rounded-xl bg-card px-4 py-3 ring-1 ring-border transition-colors hover:bg-secondary/60"
            >
              <span className="w-[92px] shrink-0 pt-0.5 text-[13px] tabular-nums text-muted-foreground">
                {a.createdAt.toISOString().slice(0, 10)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-foreground">{a.title}</span>
                {a.summary && (
                  <span className="mt-1 block truncate text-[13px] text-muted-foreground">{clip(a.summary)}</span>
                )}
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
