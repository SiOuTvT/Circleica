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
    <nav className="galvelica-pager" aria-label="分页">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="galvelica-pager-nav galvelica-pager-prev">
          ← 上一页
        </Link>
      ) : (
        <span className="galvelica-pager-nav galvelica-pager-disabled">← 上一页</span>
      )}
      <span className="galvelica-pager-count">第 {page} / {totalPages} 页</span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className="galvelica-pager-nav galvelica-pager-next">
          下一页 →
        </Link>
      ) : (
        <span className="galvelica-pager-nav galvelica-pager-disabled">下一页 →</span>
      )}
    </nav>
  )
}
