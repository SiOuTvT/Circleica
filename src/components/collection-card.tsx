import Link from "next/link"
import Image from "next/image"

export interface CollectionCardCover {
  title: string
  cover: string | null
}

export function CollectionCard({
  id,
  name,
  description,
  count,
  covers,
}: {
  id: string
  name: string
  description: string | null
  count: number
  covers: CollectionCardCover[]
}) {
  const shown = covers.slice(0, 4)
  return (
    <Link
      href={`/curated-collections/${id}`}
      className="group block overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-all hover:shadow-sm hover:ring-primary/40"
    >
      {/* 堆叠封面预览 */}
      <div className="relative h-44 overflow-hidden bg-muted">
        {shown.length > 0 ? (
          <div className="absolute inset-0 flex items-end justify-center pb-4">
            {shown.map((g, i) => (
              <div
                key={`${g.title}-${i}`}
                className="absolute transition-transform duration-300 group-hover:-translate-y-1"
                style={{
                  left: `${15 + i * 18}%`,
                  zIndex: 4 - i,
                  transform: `rotate(${(i - 1.5) * 3}deg)`,
                }}
              >
                {g.cover ? (
                  <Image
                    src={g.cover}
                    alt={g.title}
                    width={100}
                    height={140}
                    className="h-[140px] w-[100px] rounded-lg object-cover shadow-md ring-1 ring-black/10"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-[140px] w-[100px] items-center justify-center rounded-lg bg-muted-foreground/10 text-xs text-muted-foreground ring-1 ring-black/10">
                    无封面
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            暂无游戏
          </div>
        )}
      </div>

      {/* 信息 */}
      <div className="space-y-1 p-4">
        <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
          {name}
        </h3>
        {description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
        )}
        <p className="text-xs text-muted-foreground">{count} 部游戏</p>
      </div>
    </Link>
  )
}
