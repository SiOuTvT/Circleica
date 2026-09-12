"use client"

import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

import { resolveAdminNavItem } from "@/components/admin-nav"

/**
 * 后台顶部条（期 4 修）：h-14，不参与滚动（sticky top-0）、无阴影、无动画。
 * 左：当前页标题（13/600，仍用 resolveAdminNavItem 从侧栏同一份导航配置取 label）
 *     + 一个明确的「返回」按钮（history 还有上一页就 router.back()，否则回 /admin）。
 * 已撤掉「分组 / 当前页」面包屑：层级信息由侧栏承担，顶栏不再重复。
 * 右：当前管理员（12/400 辅助文字档）。
 * H1 仍由内容区的 AdminPageContainer 渲染（24/600），此处不重复大标题。
 */
export function AdminTopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  // 初值必须是 true：SSR 拿不到 window.history，首帧两侧必须一致，挂载后再按真实 history 修正
  const [canGoBack, setCanGoBack] = useState(true)

  useEffect(() => {
    setCanGoBack(window.history.length > 1)
  }, [])

  const nav = resolveAdminNavItem(pathname)
  const pageLabel = nav?.label ?? "后台"

  const name = session?.user?.name ?? "管理员"
  const image = session?.user?.image ?? null

  // 32px 高（≥28 热区下限），图标 + 文字保证「明确」，配色沿用后台控件档
  const backClass =
    "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-[var(--admin-radius-ctl)] px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"

  return (
    <div className="sticky top-14 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 text-xs font-normal backdrop-blur sm:px-8 md:top-0">
      {/* 左：返回按钮 + 当前页标题 */}
      <div className="flex min-w-0 items-center gap-2">
        {canGoBack ? (
          <button type="button" onClick={() => router.back()} aria-label="返回" className={backClass}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            返回
          </button>
        ) : (
          <Link href="/admin" className={backClass}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            返回
          </Link>
        )}
        <span className="truncate text-[13px] font-semibold text-foreground">{pageLabel}</span>
      </div>

      {/* 右：当前管理员 */}
      <div className="flex shrink-0 items-center gap-3">
        <span className="flex items-center gap-2 text-muted-foreground">
          {image ? (
            <Image
              src={image}
              alt=""
              width={20}
              height={20}
              unoptimized
              className="h-5 w-5 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-micro font-semibold text-muted-foreground">
              {(name[0] ?? "A").toUpperCase()}
            </span>
          )}
          <span className="max-w-[140px] truncate text-foreground">{name}</span>
        </span>
      </div>
    </div>
  )
}
