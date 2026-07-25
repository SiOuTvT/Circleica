import Link from "next/link"
import { SafeImage } from "@/components/safe-image"
import type { GalvelicaWorkCard } from "@/lib/galvelica"

/**
 * 编辑精选 · 杂志式卡片
 * 设计目标：封面为主、标题突出、一句简介、不堆标签、有高级感。
 * 与资源站游戏卡片区分开——它读起来像「编辑精选」而非「数据库记录」。
 */

export function EditorPicks({ works }: { works: GalvelicaWorkCard[] }) {
  if (!works.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">暂无编辑推荐的作品。</p>
  }
  const [feature, ...rest] = works
  return (
    <div className="space-y-4">
      {feature && <EditorFeature work={feature} />}
      {rest.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rest.map((w) => (
            <EditorCompact key={w.id} work={w} />
          ))}
        </div>
      )}
    </div>
  )
}

function Cover({ work, className }: { work: GalvelicaWorkCard; className?: string }) {
  if (work.coverImage) {
    return (
      <SafeImage
        src={work.coverImage}
        alt={work.title}
        fill
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        sizes="(max-width: 640px) 40vw, 260px"
        quality={80}
      />
    )
  }
  return (
    <div className={`flex h-full w-full items-center justify-center bg-secondary text-muted-foreground/40 ${className ?? ""}`}>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  )
}

function EditorFeature({ work }: { work: GalvelicaWorkCard }) {
  return (
    <Link
      href={work.href}
      className="group grid gap-5 rounded-2xl border border-border bg-card p-4 transition-colors duration-300 hover:border-[color-mix(in_srgb,var(--gal-accent)_45%,transparent)] sm:grid-cols-[260px_1fr] sm:p-5"
      title={work.title}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-muted sm:aspect-auto">
        <Cover work={work} />
        {work.isNsfw && (
          <span className="absolute right-2 top-2 rounded-md bg-[color-mix(in_srgb,var(--clr-rose)_85%,transparent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
            NSFW
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--gal-accent)]">
          编辑精选 · Editor&rsquo;s Pick
        </p>
        <h3 className="galvelica-serif text-2xl font-semibold leading-tight text-foreground transition-colors group-hover:text-[var(--gal-accent)] sm:text-3xl">
          {work.title}
        </h3>
        {work.description && (
          <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {work.description}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {work.studioName || "未知社团"}
          {work.releaseYear ? ` · ${work.releaseYear}` : ""}
          {work.originalWork ? ` · 原作 ${work.originalWork}` : ""}
        </p>
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[var(--gal-accent)]">
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

function EditorCompact({ work }: { work: GalvelicaWorkCard }) {
  return (
    <Link
      href={work.href}
      className="group flex gap-3 rounded-xl border border-border bg-card p-3 transition-colors duration-300 hover:border-[color-mix(in_srgb,var(--gal-accent)_40%,transparent)]"
      title={work.title}
    >
      <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-20">
        <Cover work={work} />
        {work.isNsfw && (
          <span className="absolute right-1 top-1 rounded bg-[color-mix(in_srgb,var(--clr-rose)_85%,transparent)] px-1 py-0.5 text-[9px] font-bold text-white">
            NSFW
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1">
        <h4 className="galvelica-serif line-clamp-2 text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-[var(--gal-accent)]">
          {work.title}
        </h4>
        {work.description && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{work.description}</p>
        )}
        <p className="truncate text-xs text-muted-foreground">
          {work.studioName || "未知社团"}
          {work.releaseYear ? ` · ${work.releaseYear}` : ""}
        </p>
      </div>
    </Link>
  )
}
