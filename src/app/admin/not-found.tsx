import Link from "next/link"
import { LayoutDashboard } from "lucide-react"

import { AdminPageContainer } from "@/components/admin-page-container"
import { adminBtnPrimary } from "@/lib/admin-styles"
import { cn } from "@/lib/utils"

/**
 * 后台专属 404：落在 app/admin/layout.tsx 的后台壳内（inShell=true），不再掉到前台根 404。
 * 覆盖两类：① 后台内 notFound()（如 /admin/games/<非法 id>）；② /admin/** 下未匹配的地址。
 * 标题走后台 24/600 档（.admin-scope 下 .text-xl → 24px，font-semibold → 600）。
 */
export default function AdminNotFound() {
  return (
    <AdminPageContainer>
      <div className="flex min-h-[50vh] flex-col items-start justify-center gap-4 py-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Not Found
        </p>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          页面不存在
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          你要找的后台页面不存在，或对应的记录已被删除。
        </p>
        <Link href="/admin" className={cn(adminBtnPrimary, "h-10")}>
          <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
          返回仪表盘
        </Link>
      </div>
    </AdminPageContainer>
  )
}
