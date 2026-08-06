import Link from "next/link"
import { SafeImage } from "@/components/safe-image"
import { Tag } from "@/components/ui/tag"
import type { FeaturedTheme, GalvelicaWorkCard } from "@/lib/galvelica"

/**
 * 首页下半部分的三大「有人味」功能块——
 * 与 nav 的机械筛选（标签/年份/社团）互斥，提供编辑声、偶遇感与策展视角。
 */

/* ── 本馆札记：给档案馆一个声音，营造阅读感 ── */
export function CuratorNote() {
  return (
    <section className="mx-auto max-w-2xl text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">
        本馆札记 · Curator&rsquo;s Note
      </p>
      <p className="galvelica-serif mt-4 text-lg leading-loose text-foreground/90 sm:text-xl">
        我们不追逐热度，只收藏那些值得被记住的名字。一部同人视觉小说的价值，
        往往不在下载量，而在多年以后，是否仍有人愿意安静地把它翻起。
      </p>
      <div className="galvelica-rule mx-auto mt-6 max-w-[120px]" />
      <p className="mt-4 text-sm text-muted-foreground">—— 馆方编辑部</p>
    </section>
  )
}

/* ── 今日缘分：按日期确定的一部，紧凑横向卡（与编辑精选的大卡区分层级）── */
export function DailyPick({ work }: { work: GalvelicaWorkCard | null }) {
  if (!work) return null
  const today = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
  return (
    <Link
      href={work.href}
      className="group flex gap-4 rounded-2xl border border-border bg-card p-4 transition-colors duration-300 hover:border-[color-mix(in_srgb,var(--gal-accent)_45%,transparent)] sm:gap-5 sm:p-5"
      title={work.title}
    >
      <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-20">
        {work.coverImage ? (
          <SafeImage
            src={work.coverImage}
            alt={work.title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 25vw, 80px"
            quality={80}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground/40">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {work.isNsfw && (
          <span className="absolute right-1 top-1 rounded bg-[color-mix(in_srgb,var(--clr-rose)_85%,transparent)] px-1 py-0.5 text-[9px] font-bold text-white">
            NSFW
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--gal-accent)]">
          今日宜读 · {today}
        </p>
        <h3 className="galvelica-serif text-lg font-semibold leading-tight text-foreground transition-colors group-hover:text-[var(--gal-accent)] sm:text-xl">
          {work.title}
        </h3>
        {work.description && (
          <p className="line-clamp-1 text-sm leading-relaxed text-muted-foreground">{work.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {work.studioName || "未知社团"}
          {work.releaseYear ? ` · ${work.releaseYear}` : ""}
          {work.originalWork ? ` · 原作 ${work.originalWork}` : ""}
        </p>
        <span className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium text-[var(--gal-accent)]">
          阅读档案
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  )
}

/* ── 专题策划：编辑视角的策展专栏（文字卡，不重复封面）── */
export function FeaturedThemes({ themes }: { themes: FeaturedTheme[] }) {
  if (!themes.length) return null
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {themes.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-colors duration-300 hover:border-[color-mix(in_srgb,var(--gal-accent)_45%,transparent)]"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground/70">{t.kicker}</p>
          <h3 className="galvelica-serif text-lg font-semibold text-foreground transition-colors group-hover:text-[var(--gal-accent)]">
            {t.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{t.blurb}</p>
          <div className="mt-auto flex items-center justify-between pt-2">
            <Tag color={t.tagColor ?? undefined} className="px-2 py-1">#{t.tagName}</Tag>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--gal-accent)]">
              进入专题
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
