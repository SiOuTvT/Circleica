import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SafeImage } from "@/components/safe-image"
import { Tag, TagGroup } from "@/components/ui/tag"
import { ViewCounter } from "@/components/view-counter"
import { RichTextContent } from "@/components/rich-text-content"
import { GalvelicaWorkBreadcrumb } from "@/components/galvelica/work-breadcrumb"
import { getWorkBySerialId } from "@/lib/galvelica"
import { isNumericId } from "@/lib/serial-id"
import { formatZhDate } from "@/lib/date"
import { CREATOR_ROLE_LABELS } from "@/types/game"
import { Eye, Heart, Star, ArrowUpRight } from "lucide-react"

export const dynamic = "force-dynamic"

const ROLE_ORDER = ["director", "scenario", "art", "chardesign", "music", "songs"]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ serialId: string }>
}): Promise<Metadata> {
  const { serialId } = await params
  if (!isNumericId(serialId)) return { title: "作品档案 · Galvelica" }
  const work = await getWorkBySerialId(parseInt(serialId, 10))
  if (!work) return { title: "作品档案 · Galvelica" }
  return {
    title: `${work.title} · Galvelica 资料库`,
    description: work.description?.replace(/<[^>]+>/g, "").slice(0, 160) || `${work.originalWork ? work.originalWork + " · " : ""}${work.title} 的同人视觉小说资料`,
    alternates: { canonical: `/galvelica/works/${work.serialId}` },
  }
}

export default async function GalvelicaWorkDetail({
  params,
}: {
  params: Promise<{ serialId: string }>
}) {
  const { serialId } = await params
  if (!isNumericId(serialId)) notFound()

  const work = await getWorkBySerialId(parseInt(serialId, 10))
  if (!work) notFound()

  // 制作人员按角色分组
  const byRole = new Map<string, typeof work.staff>()
  for (const s of work.staff) {
    if (!byRole.has(s.role)) byRole.set(s.role, [])
    byRole.get(s.role)!.push(s)
  }
  const roles = [
    ...ROLE_ORDER.filter((r) => byRole.has(r)),
    ...[...byRole.keys()].filter((r) => !ROLE_ORDER.includes(r)),
  ]

  const statusLabel: Record<string, string> = {
    FINISHED: "已完结",
    ONGOING: "连载中",
    HIATUS: "搁置",
    CANCELLED: "已取消",
  }

  return (
    <div className="galvelica-root">
      <GalvelicaWorkBreadcrumb serialId={String(work.serialId)} title={work.title} />
      <ViewCounter gameId={work.id} />

      <Link
        href="/galvelica"
        className="galvelica-navlink mb-4 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium"
      >
        ← 返回 Galvelica
      </Link>

      {/* ── 头部：封面 + 摘要 ── */}
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="galvelica-card overflow-hidden rounded-2xl">
          <div className="relative aspect-[3/4] w-full bg-muted">
            {work.coverImage ? (
              <SafeImage
                src={work.coverImage}
                alt={work.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 320px"
                priority
                quality={85}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground/40">
                <span className="text-sm">暂无封面</span>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="galvelica-serif text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            {work.title}
          </h1>
          {work.originalWork && (
            <p className="mt-1 text-sm text-muted-foreground">原作：{work.originalWork}</p>
          )}
          {work.englishName && (
            <p className="mt-0.5 text-xs text-muted-foreground/70">{work.englishName}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {work.ratingAvg != null && (
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4 text-[var(--gal-accent)]" fill="currentColor" strokeWidth={0} />
                <span className="font-semibold text-foreground tabular-nums">{work.ratingAvg}</span>
                <span className="opacity-70">({work.ratingCount})</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="tabular-nums">{work.viewCount}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-4 w-4" />
              <span className="tabular-nums">{work.favoriteCount}</span>
            </span>
          </div>

          {/* 返回主站 CTA */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={`/games/${work.serialId}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--gal-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-fg)] transition-opacity hover:opacity-90"
            >
              查看资源 · 前往下载页
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              返回主站首页
            </Link>
          </div>

          {/* 标签 */}
          {work.tags.length > 0 && (
            <div className="mt-5">
              <TagGroup>
                {work.tags.map((t) => (
                  <Tag key={t.id} color={t.color} href={`/galvelica/tags/${t.id}`} title={t.name}>
                    {t.name}
                  </Tag>
                ))}
              </TagGroup>
            </div>
          )}
        </div>
      </div>

      {/* ── 资料表 ── */}
      <div className="mt-8 grid gap-x-8 gap-y-3 rounded-2xl border border-border bg-card/40 p-5 sm:grid-cols-2">
        <Meta label="社团" value={work.studioName || "未知"} />
        <Meta
          label="发布时间"
          value={work.releaseDate ? formatZhDate(work.releaseDate) : work.releaseYear ? `${work.releaseYear} 年` : "未知"}
        />
        <Meta label="状态" value={statusLabel[work.status] ?? work.status} />
        {work.gameDuration && <Meta label="时长" value={work.gameDuration} />}
        {work.aliases && <Meta label="别名" value={work.aliases} />}
        {work.vndbId && (
          <Meta
            label="VNDB"
            value={
              <a
                href={`https://vndb.org/${work.vndbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--gal-accent)] hover:underline"
              >
                {work.vndbId} ↗
              </a>
            }
          />
        )}
      </div>

      {/* ── 制作人员 ── */}
      {roles.length > 0 && (
        <section className="mt-8">
          <h2 className="galvelica-serif text-xl font-semibold text-foreground">制作人员</h2>
          <div className="galvelica-rule mb-4 mt-2" />
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {roles.map((role) => (
              <div key={role} className="flex gap-3">
                <span className="w-16 shrink-0 pt-0.5 text-sm font-medium text-[var(--gal-accent)]">
                  {CREATOR_ROLE_LABELS[role] ?? role}
                </span>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {byRole.get(role)!.map((s) => (
                    <Link
                      key={s.id}
                      href={`/creators/${s.id}`}
                      className="text-foreground transition-colors hover:text-[var(--gal-accent)]"
                    >
                      {s.name}
                      {s.nameJa && <span className="text-muted-foreground/60">（{s.nameJa}）</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 简介 ── */}
      {work.description && (
        <section className="mt-8">
          <h2 className="galvelica-serif text-xl font-semibold text-foreground">简介</h2>
          <div className="galvelica-rule mb-4 mt-2" />
          <RichTextContent html={work.description} className="max-w-3xl text-[15px] leading-relaxed text-foreground/90" />
        </section>
      )}

      {/* ── 系列 / 相似作品 ── */}
      {work.siblings.length > 0 && (
        <section className="mt-8">
          <h2 className="galvelica-serif text-xl font-semibold text-foreground">同系列 / 相似作品</h2>
          <div className="galvelica-rule mb-4 mt-2" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
            {work.siblings.map((s) => (
              <Link key={s.id} href={`/galvelica/works/${s.serialId}`} className="galvelica-card group block overflow-hidden rounded-xl">
                <div className="relative aspect-[3/4] w-full bg-muted">
                  {s.coverImage ? (
                    <SafeImage
                      src={s.coverImage}
                      alt={s.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 30vw, 160px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground/40 text-xs">
                      无封面
                    </div>
                  )}
                </div>
                <p className="galvelica-serif line-clamp-2 p-2 text-xs font-medium leading-snug text-foreground group-hover:text-[var(--gal-accent)]">
                  {s.title}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-foreground">{value}</span>
    </div>
  )
}
