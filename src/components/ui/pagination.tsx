import { Suspense } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react"
import Link from "next/link"

import { PageJump, PageSizeSelect } from "@/components/ui/pagination-client"

interface PaginationProps {
  currentPage: number
  totalPages: number
  /** 生成页码链接的基础 URL，页码会追加为 ?{pageParam}=N */
  baseUrl: string
  /** 额外的 query 参数（会保留到分页链接中） */
  extraParams?: Record<string, string>
  /** 分页参数名（默认 "page"）。旧调用方不传 → 与原行为完全一致。 */
  pageParam?: string
  /** 当前每页条数（仅 size 选择器使用） */
  pageSize?: number
  /** 是否显示每页条数选择器（20/50/100） */
  showSizeSelector?: boolean
  /** 是否显示页码跳转输入框 */
  showJump?: boolean
}

/**
 * 生成带省略号的页码数组
 * 始终显示：第1页、最后一页、当前页及前后各1页
 */
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | "ellipsis")[] = [1]

  if (current > 3) {
    pages.push("ellipsis")
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) {
    pages.push("ellipsis")
  }

  pages.push(total)

  return pages
}

function buildUrl(
  baseUrl: string,
  page: number,
  pageParam: string,
  extraParams?: Record<string, string>,
) {
  const params = new URLSearchParams()
  params.set(pageParam, String(page))
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v)
    }
  }
  return `${baseUrl}?${params.toString()}`
}

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  extraParams,
  pageParam = "page",
  pageSize,
  showSizeSelector = false,
  showJump = false,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(currentPage, totalPages)
  const showEnds = totalPages > 1

  return (
    <div className="flex flex-col items-center gap-2">
      <nav
        aria-label="分页"
        className="flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-hide py-1"
      >
        {/* 首页 */}
        {showEnds && currentPage > 1 && (
          <Link
            href={buildUrl(baseUrl, 1, pageParam, extraParams)}
            scroll
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground ring-1 ring-border transition-colors hover:bg-accent hover:text-foreground"
            aria-label="首页"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Link>
        )}

        {/* 上一页 */}
        {currentPage > 1 && (
          <Link
            href={buildUrl(baseUrl, currentPage - 1, pageParam, extraParams)}
            scroll
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground ring-1 ring-border transition-colors hover:bg-accent hover:text-foreground"
            aria-label="上一页"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}

        {/* 页码 */}
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e${i}`} className="flex h-11 w-11 items-center justify-center text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <Link
              key={p}
              href={buildUrl(baseUrl, p, pageParam, extraParams)}
              scroll
              className={`flex h-11 min-w-11 items-center justify-center rounded-xl px-3 text-sm transition-colors ${
                p === currentPage
                  ? "bg-primary/15 text-primary font-medium ring-1 ring-primary/20"
                  : "text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground"
              }`}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </Link>
          )
        )}

        {/* 下一页 */}
        {currentPage < totalPages && (
          <Link
            href={buildUrl(baseUrl, currentPage + 1, pageParam, extraParams)}
            scroll
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground ring-1 ring-border transition-colors hover:bg-accent hover:text-foreground"
            aria-label="下一页"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}

        {/* 尾页 */}
        {showEnds && currentPage < totalPages && (
          <Link
            href={buildUrl(baseUrl, totalPages, pageParam, extraParams)}
            scroll
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground ring-1 ring-border transition-colors hover:bg-accent hover:text-foreground"
            aria-label="尾页"
          >
            <ChevronsRight className="h-4 w-4" />
          </Link>
        )}
      </nav>

      {(showSizeSelector || showJump) && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {showSizeSelector && (
            <Suspense fallback={null}>
              <PageSizeSelect pageSize={pageSize} />
            </Suspense>
          )}
          {showJump && (
            <Suspense fallback={null}>
              <PageJump
                key={currentPage}
                pageParam={pageParam}
                currentPage={currentPage}
                totalPages={totalPages}
              />
            </Suspense>
          )}
        </div>
      )}
    </div>
  )
}
