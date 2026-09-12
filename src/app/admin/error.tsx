"use client"

import Link from "next/link"
import { useEffect } from "react"

import { AdminPageContainer } from "@/components/admin-page-container"
import { adminBtnPrimary, adminBtnSecondary } from "@/lib/admin-styles"
import { captureClientError } from "@/lib/client-error"
import { logger } from "@/lib/logger"
import { cn } from "@/lib/utils"

/**
 * 后台统一错误边界：一处覆盖 src/app/admin/** 全部页面（含 admin/galvelica/**）与 admin 下的 SPA 子路由。
 * 只兜底「本段没有更具体 error.tsx」的情况——admin/games、admin/collections、admin/achievements
 * 三处已有更具体的局部边界，优先级本就更高，保持不动。
 *
 * 观感与尺度对齐 src/app/admin/not-found.tsx：同一套 AdminPageContainer 壳，
 * 字号只用 11/12/13/24，圆角只用 6（rounded-md）/ 12（rounded-xl），不引入新色值。
 * 注意：不能做成 app/error.tsx 那种前台样式（text-8xl 感叹号 + 返回首页），后台边界留在后台壳内。
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.system.error("[AdminError]", error)
    captureClientError(error)
  }, [error])

  return (
    <AdminPageContainer>
      <div className="flex min-h-[50vh] flex-col items-start justify-center gap-4 py-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Error
        </p>
        <h1 className="font-heading text-xl font-bold text-foreground">
          这个页面出了点问题
        </h1>
        <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">
          可以重试；反复失败请把下面的错误编号记下。
        </p>
        {error.digest && (
          <code className="num-tab select-all rounded-md bg-secondary px-3 py-2 font-mono text-[11px] text-muted-foreground">
            {error.digest}
          </code>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className={cn(adminBtnPrimary, "h-10")}
          >
            重试
          </button>
          <Link href="/admin" className={cn(adminBtnSecondary, "h-10")}>
            返回仪表盘
          </Link>
        </div>
      </div>
    </AdminPageContainer>
  )
}
