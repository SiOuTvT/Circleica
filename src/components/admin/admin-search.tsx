import { Search } from "lucide-react"

import { adminSearchInput } from "@/lib/admin-styles"

interface AdminSearchProps {
  name?: string
  defaultValue?: string
  placeholder?: string
  /** 表单提交的 action URL。省略时提交到当前路径（同 URL）。 */
  action?: string
  /**
   * 提交时是否重置分页等其它与搜索冲突的参数。
   * 若为真且存在其它参数，交由消费页负责（本组件仅渲染表单）。
   */
  resetPage?: boolean
}

/**
 * AdminSearch — 后台统一搜索表单（Server Component）。
 * 保持 adminSearchInput token 样式不变；左侧 Search 图标绝对定位。
 */
export function AdminSearch({
  name,
  defaultValue,
  placeholder,
  action,
}: AdminSearchProps) {
  return (
    <form method="get" action={action} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        name={name ?? "q"}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={adminSearchInput}
      />
    </form>
  )
}
