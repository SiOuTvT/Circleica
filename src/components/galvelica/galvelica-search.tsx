import { Search } from "lucide-react"

/**
 * 副站检索框：统一导航栏与列表页的搜索样式（原为三套内联实现）。
 * 基于 URL 查询参数（search），与列表页过滤模式一致；移动端常显。
 */
export function GalvelicaSearch({ className }: { className?: string }) {
  return (
    <form action="/galvelica/works" method="get" className={className}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
        />
        <input
          type="search"
          name="search"
          placeholder="检索作品、社团…"
          className="w-32 rounded-lg border border-input bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-[var(--gal-accent)] focus:outline-none sm:w-44 lg:w-52"
          aria-label="检索"
        />
      </div>
    </form>
  )
}
