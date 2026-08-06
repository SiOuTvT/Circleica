import type { Metadata } from "next"
import Link from "next/link"
import { getStudios } from "@/lib/galvelica"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "社团索引 · Galvelica",
  description: "浏览制作同人视觉小说的社团，按作品数量排序。",
  alternates: { canonical: "/galvelica/studios" },
}

export default async function GalvelicaStudios() {
  const studios = await getStudios()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="galvelica-h1">社团索引</h1>
        <p className="mt-1 text-sm text-muted-foreground">共 {studios.length} 个社团。</p>
      </div>

      {studios.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">暂无收录的社团。</p>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studios.map(({ name, count }) => (
            <Link
              key={name}
              href={`/galvelica/studios/${encodeURIComponent(name)}`}
              className="galvelica-card group flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5"
            >
              <span className="min-w-0 truncate font-medium text-foreground group-hover:text-[var(--gal-accent)]">
                {name}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{count} 部</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
