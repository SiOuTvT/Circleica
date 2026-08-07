import Link from "next/link"
import { SafeImage } from "@/components/safe-image"
import { Tag } from "@/components/ui/tag"
import type { FeaturedTheme, GalvelicaWorkCard } from "@/lib/galvelica"

/**
 * 首页下半部分的功能块——
 * 与 nav 的机械筛选（标签/年份/社团）互补，提供偶遇感与编辑视角。
 */

/* ── 今日偶遇：按日期确定的一部，纵向卡（桌面端撑满侧栏高度，消除留白）── */
export function DailyPick({ work }: { work: GalvelicaWorkCard | null }) {
  if (!work) return null
  const today = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
  return (
    <Link
      href={work.href}
      className="group flex flex-1 flex-col gap-4 rounded-2xl border border-border bg-card p-4 transition-colors duration-300 hover:border-[color-mix(in_srgb,var(--gal-accent)_45%,transparent)] sm:p-5"
      title={work.title}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-muted">
        {work.coverImage ? (
          <SafeImage
            src={work.coverImage}
            alt={work.title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, 33vw"
            quality={80}
          />
        ) : work.coverHidden ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-secondary to-muted">
            <span className="text-micro font-medium text-muted-foreground">封面已隐藏（露骨）</span>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[color-mix(in_srgb,var(--gal-accent)_16%,transparent)] to-[color-mix(in_srgb,var(--gal-accent)_4%,transparent)]">
            <span className="galvelica-serif text-3xl font-semibold text-[color-mix(in_srgb,var(--gal-accent)_38%,transparent)]">
              {(work.title || "?").trim().charAt(0).toUpperCase()}
            </span>
            <span className="text-micro font-medium text-muted-foreground/60">暂无封面</span>
          </div>
        )}
        {work.isNsfw && (
          <span className="absolute right-1 top-1 rounded bg-[color-mix(in_srgb,var(--clr-rose)_85%,transparent)] px-1 py-0.5 text-micro font-bold text-white">
            NSFW
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-caption font-medium uppercase tracking-[0.24em] text-[var(--gal-accent)]">
          今日偶遇 · {today}
        </p>
        <h3 className="text-lg font-semibold leading-tight text-foreground transition-colors group-hover:text-[var(--gal-accent)] sm:text-xl">
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
      </div>
      <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-[var(--gal-accent)]">
        翻开看看
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  )
}

/* ── 专题：编辑视角的专题专栏（文字卡，不重复封面）── */
export function FeaturedThemes({ themes, tagColor }: { themes: FeaturedTheme[]; tagColor?: string }) {
  if (!themes.length) return null
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {themes.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-colors duration-300 hover:border-[color-mix(in_srgb,var(--gal-accent)_45%,transparent)]"
        >
          <p className="text-caption font-medium uppercase tracking-[0.24em] text-muted-foreground/70">{t.kicker}</p>
          <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-[var(--gal-accent)]">
            {t.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{t.blurb}</p>
          <div className="mt-auto flex items-center justify-between pt-2">
            <Tag color={t.tagColor || tagColor} className="px-2 py-1">#{t.tagName}</Tag>
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
