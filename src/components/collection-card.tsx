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

  // featured 模式：封面错位叠放 + 右侧信息（竖版封面完整展示，不再横裁）
  if (featured && covers.length > 0) {
    const tiles = covers.slice(0, 4)
    return (
      <Link
        href={href}
        className="group flex items-center gap-6 rounded-2xl bg-card p-5 ring-1 ring-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:ring-foreground/10 hover:shadow-[0_3px_8px_rgba(0,0,0,0.08)]  sm:gap-8"
        style={{ minHeight: 230 }}
      >
        {/* 封面错位叠放：前 4 张竖版封面依次向右后错、露出边缘，第一张在最前 */}
        <div
          className="relative shrink-0"
          style={{ width: 150 + (tiles.length - 1) * 26, height: 210 }}
        >
          {tiles.map((c, i) => (
            <div
              key={`${c.title}-${i}`}
              className="absolute overflow-hidden rounded-xl bg-muted ring-1 ring-border shadow-sm"
              style={{ width: 150, height: 210, left: i * 26, zIndex: tiles.length - i }}
            >
              {c.cover ? (
                <Image
                  src={c.cover}
                  alt={c.title}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <span className="text-base font-bold text-primary/30">?</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 信息区 */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <span className="inline-block w-fit rounded-full bg-primary/80 px-3 py-0.5 text-caption font-medium uppercase tracking-wider text-primary-foreground">
            编辑精选
          </span>
          <h2 className="text-xl font-heading font-semibold text-foreground sm:text-2xl">
            {name}
          </h2>
          {description && (
            <p className="max-w-xl text-sm text-muted-foreground line-clamp-1">{description}</p>
          )}
          <p className="text-xs tabular-nums text-muted-foreground/70">{count} 部精选</p>
        </div>
      </Link>
    )
  }

  // 普通模式：封面在左，信息在右
  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-2xl bg-card p-4 ring-1 ring-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:ring-foreground/10 hover:shadow-[0_3px_8px_rgba(0,0,0,0.08)] "
    >
      {/* 封面区 */}
      <div className="relative w-20 shrink-0 aspect-[3/4] rounded-xl overflow-hidden bg-muted ring-1 ring-border sm:w-24">
        {primary?.cover ? (
          <Image
            src={primary.cover}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
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
