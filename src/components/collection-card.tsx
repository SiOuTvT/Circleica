import Link from "next/link"
import Image from "next/image"

export interface CollectionCardCover {
  title: string
  cover: string | null
}

export function CollectionCard({
  id,
  slug,
  name,
  description,
  count,
  covers,
  featured,
}: {
  id: string
  /** Archive 稳定可读路由（CJK 直出）；缺省回退旧路由由 308 接住 */
  slug?: string | null
  name: string
  description: string | null
  count: number
  covers: CollectionCardCover[]
  featured?: boolean
}) {
  const primary = covers[0]
  // slug 优先走新路由 /credits/collection/[slug]；缺失时回退旧 /collections/[id]（旧路由 308 再接）
  const href = slug
    ? `/credits/collection/${encodeURIComponent(slug)}`
    : `/collections/${id}`

  // featured 模式：首条合集放大型封面卡
  if (featured && primary?.cover) {
    return (
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-2xl bg-muted transition-all duration-500 hover:shadow-lg"
        style={{ aspectRatio: "21 / 9" }}
      >
        <Image
          src={primary.cover}
          alt={name}
          fill
          className="object-cover transition-all duration-700 group-hover:scale-105"
          unoptimized
          sizes="(max-width: 1024px) 100vw, 896px"
        />
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <span className="inline-block rounded-full bg-primary/80 px-3 py-0.5 text-caption font-medium uppercase tracking-wider text-primary-foreground mb-2">
            编辑精选
          </span>
          <h2 className="text-xl font-heading font-semibold text-white sm:text-2xl">
            {name}
          </h2>
          {description && (
            <p className="mt-1 max-w-lg text-sm text-white/70 line-clamp-1">
              {description}
            </p>
          )}
          <p className="mt-2 text-xs text-white/50">{count} 部精选</p>
        </div>
      </Link>
    )
  }

  // 普通模式：封面在左，信息在右
  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-2xl bg-card p-4 ring-1 ring-border/50 transition-all duration-300 hover:ring-foreground/10 hover:shadow-sm"
    >
      {/* 封面区 */}
      <div className="relative w-20 shrink-0 aspect-[3/4] rounded-xl overflow-hidden bg-muted ring-1 ring-border/50 sm:w-24">
        {primary?.cover ? (
          <Image
            src={primary.cover}
            alt={name}
            fill
            className="object-cover transition-all duration-500 group-hover:scale-105"
            unoptimized
            sizes="(max-width: 640px) 80px, 96px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-xs font-bold text-primary/30">?</span>
          </div>
        )}
      </div>

      {/* 信息区 */}
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <h3 className="truncate text-sm font-heading font-semibold text-foreground transition-colors group-hover:text-primary sm:text-base">
          {name}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
        <p className="mt-2 text-caption tabular-nums text-muted-foreground/50">
          {count} 部精选
        </p>
      </div>
    </Link>
  )
}
