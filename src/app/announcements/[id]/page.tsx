import { RichTextContent } from "@/components/rich-text-content-wrapper"
import { prisma } from "@/lib/prisma"
import { ArrowLeft, Clock } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const ann = await prisma.announcement.findUnique({
    where: { id, isActive: true },
    select: { title: true, content: true, imageUrl: true },
  })
  if (!ann) return { title: "公告 · Circleica" }
  return {
    title: `${ann.title} · 公告`,
    description: ann.content.replace(/<[^>]+>/g, "").slice(0, 160),
    openGraph: {
      title: ann.title,
      ...(ann.imageUrl && { images: [{ url: ann.imageUrl }] }),
    },
  }
}

/** 从 HTML 中提取标题锚点作为索引 */
function extractHeadings(html: string): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = []
  const regex = /<h([2-4])[^>]*>(.*?)<\/h[2-4]>/gi
  let match: RegExpExecArray | null
  let idx = 0
  while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, "").trim()
    if (text) {
      headings.push({ id: `section-${idx}`, text: text.slice(0, 50) })
      idx++
    }
  }
  return headings
}

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const ann = await prisma.announcement.findFirst({ where: { id, isActive: true } })
  if (!ann) notFound()

  // 获取发布人实时头像（通过 authorName 查询用户表）
  const publisher = ann.authorName
    ? await prisma.user.findFirst({ where: { username: ann.authorName }, select: { avatar: true } }).catch(() => null)
    : null

  // 按 createdAt 排序获取所有公告，用于 prev/next
  const allAnnouncements = await prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true, isPinned: true },
  })

  const currentIndex = allAnnouncements.findIndex((a) => a.id === id)
  const prev = currentIndex < allAnnouncements.length - 1 ? allAnnouncements[currentIndex + 1] : null
  const next = currentIndex > 0 ? allAnnouncements[currentIndex - 1] : null
  const otherAnnouncements = allAnnouncements.filter((a) => a.id !== id)

  // 发布人信息：优先使用数据库实时头像，其次存储的快照
  const author = {
    name: ann.authorName || "Circleica",
    avatar: publisher?.avatar || ann.authorAvatar || null,
  }

  const headings = extractHeadings(ann.content)
  const showIndex = headings.length >= 2

  const createdDate = new Date(ann.createdAt)
  const dateStr = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}-${String(createdDate.getDate()).padStart(2, "0")}`

  return (
    <div className="w-full">
      {/* PC: 左右分栏；移动端: 单列 */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

        {/* ═══ 左侧：公告主内容 ═══ */}
        <article className="flex-1 min-w-0">
          {/* 封面图 */}
          {ann.imageUrl && (
            <div className="relative mb-5 overflow-hidden rounded-xl" style={{ maxHeight: 300 }}>
              <Image
                src={ann.imageUrl}
                alt={ann.title}
                width={800}
                height={300}
                className="w-full object-cover"
                sizes="(max-width: 768px) 100vw, 60vw"
                priority
              />
            </div>
          )}

          {/* 标题 */}
          <h1 className="text-2xl sm:text-3xl font-bold leading-snug text-foreground mb-4">
            {ann.title}
          </h1>

          {/* 发布人信息：头像 + 用户名 + 发布时间（同一行） */}
          <div className="flex items-center gap-3 mb-6">
            {author.avatar ? (
              <img
                src={author.avatar}
                alt={author.name}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-border/50"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center ring-1 ring-border/30">
                <span className="text-sm font-bold text-primary/70">{(author.name || "C")[0]}</span>
              </div>
            )}
            <div className="flex items-center gap-4">
              <span className="text-base font-medium text-foreground">{author.name}</span>
              <span className="text-sm text-muted-foreground/60 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                {dateStr}
              </span>
            </div>
          </div>

          {/* 分割线 */}
          <div className="h-px bg-border/30 mb-6" />

          {/* 正文 */}
          <div className="text-[15px] leading-[1.8] text-foreground/85">
            <RichTextContent html={ann.content} />
          </div>

          {/* 上一篇 / 下一篇 */}
          {(prev || next) && (
            <div className="mt-10 pt-6 border-t border-border/30 flex flex-col sm:flex-row sm:justify-between gap-3">
              {prev ? (
                <Link href={`/announcements/${prev.id}`} className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
                  <span className="truncate">{prev.title}</span>
                </Link>
              ) : <div />}
              {next && (
                <Link href={`/announcements/${next.id}`} className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors justify-end">
                  <span className="truncate">{next.title}</span>
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0 rotate-180 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
                </Link>
              )}
            </div>
          )}
        </article>

        {/* ═══ 右侧：本篇索引 + 其他公告（sticky） ═══ */}
        <aside className="hidden lg:flex flex-col w-[280px] shrink-0 gap-5 sticky top-20 self-start max-h-[calc(100vh-6rem)]">

          {/* 本篇索引 */}
          {showIndex && (
            <div className="rounded-xl bg-muted/30 border border-border/20 p-4 flex flex-col" style={{ maxHeight: "260px" }}>
              <h3 className="text-sm font-semibold text-foreground/70 mb-3">本篇索引</h3>
              <nav className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-1 scrollbar-thin">
                {headings.map((h) => (
                  <a
                    key={h.id}
                    href={`#${h.id}`}
                    className="text-[14px] text-muted-foreground/80 hover:text-foreground hover:bg-muted/50 rounded px-2 py-2 transition-colors"
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* 其他公告 */}
          <div className="rounded-xl bg-muted/30 border border-border/20 p-4 flex flex-col min-h-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground/70 mb-3">其他公告</h3>
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-1 scrollbar-thin">
              {allAnnouncements.length > 0 ? (
                allAnnouncements.map((a) => (
                  <Link
                    key={a.id}
                    href={`/announcements/${a.id}`}
                    className={`text-[14px] rounded px-2 py-2 transition-colors ${
                      a.id === id
                        ? "text-foreground font-medium bg-primary/10"
                        : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {a.isPinned && <span className="text-primary mr-1">📌</span>}
                    {a.title}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground/40">暂无其他公告</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* 移动端：索引 + 其他公告 */}
      <div className="lg:hidden mt-8 space-y-5">
        {showIndex && (
          <div className="rounded-xl bg-muted/30 border border-border/20 p-4">
            <h3 className="text-sm font-semibold text-foreground/70 mb-3">本篇索引</h3>
            <nav className="flex flex-col gap-1">
              {headings.map((h) => (
                <a key={h.id} href={`#${h.id}`} className="text-[14px] text-muted-foreground/80 hover:text-foreground rounded px-2 py-2 transition-colors">
                  {h.text}
                </a>
              ))}
            </nav>
          </div>
        )}
        <div className="rounded-xl bg-muted/30 border border-border/20 p-4">
          <h3 className="text-sm font-semibold text-foreground/70 mb-3">其他公告</h3>
          <div className="flex flex-col gap-1">
            {otherAnnouncements.slice(0, 8).map((a) => (
              <Link
                key={a.id}
                href={`/announcements/${a.id}`}
                className={`text-[14px] rounded px-2 py-2 transition-colors ${
                  a.id === id ? "text-foreground font-medium bg-primary/10" : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {a.isPinned && <span className="text-primary mr-1">📌</span>}
                {a.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
