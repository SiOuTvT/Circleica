import Link from "next/link"

interface PagerProps {
  basePath: string
  /** 当前筛选参数（不含 page） */
  query?: Record<string, string | undefined>
  page: number
  totalPages: number
}

export function Pager({ basePath, query = {}, page, totalPages }: PagerProps) {
  if (totalPages <= 1) return null

  const hrefFor = (p: number) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") params.set(k, v)
    }
    if (p > 1) params.set("page", String(p))
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="galvelica-navlink rounded-lg px-4 py-2 text-sm font-medium">
          ← 上一页
        </Link>
      ) : (
        <span className="rounded-lg px-4 py-2 text-sm text-muted-foreground/40">← 上一页</span>
      )}
      <span className="text-sm tabular-nums text-muted-foreground">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className="galvelica-navlink rounded-lg px-4 py-2 text-sm font-medium">
          下一页 →
        </Link>
      ) : (
        <span className="rounded-lg px-4 py-2 text-sm text-muted-foreground/40">下一页 →</span>
      )}
    </div>
  )
}
