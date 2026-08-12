import type { Metadata } from "next"
import Link from "next/link"
import { getStudios } from "@/lib/galvelica"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "社团索引 · Galvelica",
  description: "浏览制作同人视觉小说的社团，按作品数量排序。",
  alternates: { canonical: "/galvelica/studios" },
}

const STUDIOS_PER_PAGE = 60

export default async function GalvelicaStudios({ searchParams }: { searchParams: { page?: string } }) {
  const all = await getStudios()
  const total = all.length
  const totalPages = Math.max(1, Math.ceil(total / STUDIOS_PER_PAGE))
  const page = Math.min(totalPages, Math.max(1, Number(searchParams.page) || 1))
  const start = (page - 1) * STUDIOS_PER_PAGE
  const studios = all.slice(start, start + STUDIOS_PER_PAGE)

  const mkPage = (p: number) => `/galvelica/studios${p > 1 ? `?page=${p}` : ""}`

  return (
    <div className="space-y-8">
      <div>
        <p className="text-caption font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">GALVELICA · 社团</p>
        <h1 className="galvelica-h1 mt-2">社团索引</h1>
        <p className="mt-1 text-sm text-muted-foreground">共 {total} 个社团，第 {page}/{totalPages} 页。</p>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href={mkPage(page - 1)}
            aria-disabled={page <= 1}
            className={`rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"}`}
          >
            上一页
          </Link>
          <span className="text-sm tabular-nums text-muted-foreground">{page} / {totalPages}</span>
          <Link
            href={mkPage(page + 1)}
            aria-disabled={page >= totalPages}
            className={`rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-muted"}`}
          >
            下一页
          </Link>
        </div>
      )}
    </div>
  )
}
