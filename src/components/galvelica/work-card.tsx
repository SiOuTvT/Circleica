import Link from "next/link"
import { SafeImage } from "@/components/safe-image"
import { Tag, TagGroup } from "@/components/ui/tag"
import type { GalvelicaWorkCard, GalvelicaTag } from "@/lib/galvelica"
import { GAME } from "@/lib/config"

interface WorkCardProps {
  work: GalvelicaWorkCard
  priority?: boolean
}

export function WorkCard({ work, priority }: WorkCardProps) {
  return (
    <Link
      href={`/galvelica/works/${work.serialId}`}
      className="galvelica-card group block overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gal-accent)]"
      title={work.title}
    >
      {/* 封面 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        {work.coverImage ? (
          <SafeImage
            src={work.coverImage}
            alt={work.title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
            priority={priority}
            quality={80}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground/40">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {work.isNsfw && (
          <span className="absolute right-2 top-2 rounded-md bg-[color-mix(in_srgb,var(--clr-rose)_85%,transparent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
            NSFW
          </span>
        )}
      </div>

      {/* 信息区 */}
      <div className="flex min-h-0 flex-col gap-1.5 p-3">
        <h3 className="galvelica-serif line-clamp-2 text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-[var(--gal-accent)]">
          {work.title}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {work.studioName || "未知社团"}
          {work.releaseYear ? ` · ${work.releaseYear}` : ""}
        </p>
        {work.tags.length > 0 && (
          <TagGroup className="mt-0.5">
            {work.tags.slice(0, GAME.VISIBLE_TAGS).map((t: GalvelicaTag) => (
              <Tag key={t.id} color={t.color} className="max-w-[88px] truncate" title={t.name}>
                {t.name}
              </Tag>
            ))}
          </TagGroup>
        )}
      </div>
    </Link>
  )
}

export function WorkGrid({ works, priorityCount = 0 }: { works: GalvelicaWorkCard[]; priorityCount?: number }) {
  if (!works.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">暂无收录的作品。</p>
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {works.map((w, i) => (
        <WorkCard key={w.id} work={w} priority={i < priorityCount} />
      ))}
    </div>
  )
}
