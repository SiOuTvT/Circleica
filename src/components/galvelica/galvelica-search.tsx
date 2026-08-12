import { Search } from "lucide-react"

interface GalvelicaSearchProps {
  className?: string
  /** 初始检索词（列表页回填） */
  defaultValue?: string
  /** 随表单提交的隐藏字段（如 tags / year / studio 筛选） */
  hiddenFields?: Record<string, string | undefined>
  /** 提供时渲染实色「检索」按钮（首页 Hero / 列表页）；不提供则仅搜索框（导航栏） */
  submitLabel?: string
  placeholder?: string
  /** 首页 Hero 用：输入框拉伸填满整行，作成更突出的检索条 */
  fullWidth?: boolean
}

/**
 * 副站检索框：统一导航栏、列表页与首页 Hero 的搜索样式（原为三套内联实现）。
 * 基于 URL 查询参数（search），与列表页过滤模式一致；移动端常显。
 */
export function GalvelicaSearch({ className, defaultValue, hiddenFields, submitLabel, placeholder = "检索作品、社团…", fullWidth }: GalvelicaSearchProps) {
  return (
    <form action="/galvelica/works" method="get" className={className}>
      <div className={fullWidth ? "relative flex-1" : "relative"}>
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
        />
        <input
          type="search"
          name="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={
            fullWidth
              ? "w-full min-w-0 rounded-lg border border-input bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-[var(--gal-accent)] focus:outline-none"
              : "w-full min-w-0 rounded-lg border border-input bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-[var(--gal-accent)] focus:outline-none"
          }
          aria-label="检索"
        />
      </div>
      {hiddenFields &&
        Object.entries(hiddenFields).map(([k, v]) =>
          v ? <input key={k} type="hidden" name={k} value={v} /> : null,
        )}
      {submitLabel && (
        <button
          type="submit"
          className="rounded-xl bg-[var(--gal-accent)] px-4 py-2 text-sm font-medium text-[var(--theme-fg)] transition-opacity hover:opacity-90"
        >
          {submitLabel}
        </button>
      )}
    </form>
  )
}
