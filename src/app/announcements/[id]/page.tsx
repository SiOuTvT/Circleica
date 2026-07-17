import { RichTextContent } from "@/components/rich-text-content-wrapper"
import { prisma } from "@/lib/prisma"
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ann = await prisma.announcement.findUnique({
    where: { id, isActive: true },
    select: { title: true, content: true, imageUrl: true },
  })
  if (!ann) return { title: "公告 · 同人游戏站" }
  const description = ann.content.replace(/<[^>]+>/g, "").slice(0, 160)
  return {
    title: `${ann.title} · 同人游戏站`,
    description,
    openGraph: {
      title: ann.title,
      description,
      ...(ann.imageUrl && { images: [{ url: ann.imageUrl }] }),
    },
  }
}

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const ann = await prisma.announcement.findFirst({ where: { id, isActive: true } })
  if (!ann) notFound()

  const [prev, next] = await Promise.all([
    prisma.announcement.findFirst({
      where: { isActive: true, createdAt: { lt: ann.createdAt } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.announcement.findFirst({
      where: { isActive: true, createdAt: { gt: ann.createdAt } },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    }),
  ])

  const createdDate = new Date(ann.createdAt)
  const updatedDate = new Date(ann.updatedAt)
  const isEdited = createdDate.getTime() !== updatedDate.getTime()

  const formatDate = (d: Date) =>
    d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="mx-auto max-w-2xl">
      {/* 返回 */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        返回首页
      </Link>

      {/* 封面图 */}
      {ann.imageUrl && (
        <div className="relative mb-5 overflow-hidden rounded-xl" style={{ maxHeight: 360 }}>
          <Image
            src={ann.imageUrl}
            alt={ann.title}
            width={720}
            height={360}
            className="w-full object-cover"
            sizes="(max-width: 672px) 100vw, 672px"
            priority
          />
        </div>
      )}

      {/* 元信息 */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {ann.authorAvatar ? (
          <Image
            src={ann.authorAvatar}
            alt={ann.authorName}
            width={20}
            height={20}
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : (
          <div className="h-5 w-5 rounded-full bg-muted" />
        )}
        <span className="font-medium text-foreground/80">{ann.authorName}</span>
        <span className="text-muted-foreground/30">·</span>
        <time dateTime={ann.createdAt.toISOString()}>{formatDate(createdDate)}</time>
        {isEdited && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-muted-foreground/50">编辑于 {formatDate(updatedDate)}</span>
          </>
        )}
      </div>

      {/* 标题 */}
      <h1 className="mb-6 text-2xl font-bold leading-snug text-foreground sm:text-3xl">
        {ann.title}
      </h1>

      {/* 正文 */}
      <div
        className="text-sm leading-relaxed text-foreground/80 sm:text-base"
        style={{ maxWidth: "65ch" }}
      >
        <RichTextContent html={ann.content} />
      </div>

      {/* 外部链接 */}
      {ann.link && (
        <a
          href={ann.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:underline"
        >
          查看详情
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
        </a>
      )}

      {/* 上下篇 */}
      {(prev || next) && (
        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
          {prev ? (
            <Link
              href={`/announcements/${prev.id}`}
              className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.5} />
              <span className="truncate">{prev.title}</span>
            </Link>
          ) : <div />}
          {next && (
            <Link
              href={`/announcements/${next.id}`}
              className="group flex items-center justify-end gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:text-right"
            >
              <span className="truncate">{next.title}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
