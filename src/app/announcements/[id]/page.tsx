import { RichTextContent } from "@/components/rich-text-content-wrapper"
import { prisma } from "@/lib/prisma"
import { ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ann = await prisma.announcement.findUnique({ where: { id, isActive: true }, select: { title: true } })
  return { title: ann ? `${ann.title} · 同人游戏站` : "公告" }
}

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ann = await prisma.announcement.findFirst({ where: { id, isActive: true } })
  if (!ann) notFound()

  return (
    <div className="w-full">
      <Link href="/" className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        返回首页
      </Link>

      {/* 完整封面图（未裁剪） */}
      {ann.imageUrl && (
        <div className="mb-6 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ann.imageUrl}
            alt={ann.title}
            className="w-full object-contain"
          />
        </div>
      )}

      <h1 className="text-2xl font-bold leading-tight text-foreground">{ann.title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(ann.createdAt).toLocaleString("zh-CN", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>

      <div className="mt-6 text-sm leading-relaxed text-muted-foreground">
        <RichTextContent html={ann.content} />
      </div>

      {ann.link && (
        <a
          href={ann.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-foreground ring-1 ring-border transition-all hover:bg-accent/80"
        >
          查看详情
          <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
        </a>
      )}
    </div>
  )
}
