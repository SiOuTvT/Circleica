"use client"

import Link from "next/link"
import { SafeImage } from "@/components/safe-image"
import { Eye } from "lucide-react"
import { Tag, TagGroup } from "@/components/ui/tag"
import type { GalvelicaWorkCard, GalvelicaTag } from "@/lib/galvelica"
import { GAME } from "@/lib/config"

interface WorkCardProps {
  work: GalvelicaWorkCard
  priority?: boolean
  /** 是否在卡片底部展示标签（首页展览网格可关闭以保持克制） */
  showTags?: boolean
  /** 副站统一标签色。传入时覆盖 per-tag color，实现「所有标签同色」。 */
  tagColor?: string
}

function fmtViews(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function WorkCard({ work, priority, showTags = true, tagColor }: WorkCardProps) {
  return (
    <Link
      href={work.href}
      onClick={() => {
        // 标记「从卡片点击进入」，由详情页 WorkViewCounter 上报一次浏览（防刷新重复计数）
        try { sessionStorage.setItem(`pending_work_view_${work.id}`, "1") } catch { /* 忽略 */ }
      }}
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
          /* 品牌化占位：标题首字 + 副站主题色渐变（无封面时） */
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[color-mix(in_srgb,var(--gal-accent)_16%,transparent)] to-[color-mix(in_srgb,var(--gal-accent)_4%,transparent)]">
            <span className="galvelica-serif text-5xl font-semibold text-[color-mix(in_srgb,var(--gal-accent)_38%,transparent)]">
              {(work.title || "?").trim().charAt(0).toUpperCase()}
            </span>
            <span className="mt-1 text-micro font-medium text-muted-foreground/60">暂无封面</span>
          </div>
        )}
        {work.isNsfw && (
          <span className="absolute right-2 top-2 rounded-md bg-[color-mix(in_srgb,var(--clr-rose)_85%,transparent)] px-1.5 py-0.5 text-micro font-bold text-white">
            NSFW
          </span>
        )}
        {work.doujinCategory && (
          <span
            className={`absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-micro font-bold ${
              work.doujinCategory === "PURE"
                ? "bg-[color-mix(in_srgb,var(--gal-accent)_14%,transparent)] text-[var(--gal-accent)]"
                : "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
            }`}
            title={
              work.doujinCategory === "PURE"
                ? "纯正同人：个人或无注册社团自主制作，仅同人渠道分发"
                : "同人系公司：早年为同人社团、后期注册公司的厂商作品（同人衍生商业作）"
            }
          >
            {work.doujinCategory === "PURE" ? "纯正同人" : "同人系公司"}
          </span>
        )}
      </div>

      {/* 信息区 */}
      <div className="flex min-h-0 flex-col gap-1 p-2.5">
        <h3 className="galvelica-serif line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-[var(--gal-accent)]">
          {work.title}
        </h3>
        <p className="truncate text-[11px] text-muted-foreground">
          {work.studioName || "未知社团"}
          {work.releaseYear ? ` · ${work.releaseYear}` : ""}
        </p>
        {work.viewCount > 0 && (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Eye className="h-3 w-3 shrink-0" aria-hidden />
            {fmtViews(work.viewCount)}
          </p>
        )}
        {showTags && work.tags.length > 0 && (
          <TagGroup className="mt-0.5">
            {work.tags.slice(0, GAME.VISIBLE_TAGS).map((t: GalvelicaTag) => (
              <Tag key={t.id} color={t.color || tagColor} className="max-w-[76px] truncate" title={t.name}>
                {t.name}
              </Tag>
            ))}
          </TagGroup>
        )}
      </div>
    </Link>
  )
}

export function WorkGrid({ works, priorityCount = 0, showTags = true, tagColor }: { works: GalvelicaWorkCard[]; priorityCount?: number; showTags?: boolean; tagColor?: string }) {
  if (!works.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">暂无收录的作品。</p>
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {works.map((w, i) => (
        <WorkCard key={w.id} work={w} priority={i < priorityCount} showTags={showTags} tagColor={tagColor} />
      ))}
    </div>
  )
}
