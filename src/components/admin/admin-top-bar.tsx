"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

import { resolveAdminNavItem } from "@/components/admin-nav"
import { cn } from "@/lib/utils"

type SiteKey = "circleica" | "galvelica"

/**
 * 后台顶部条（期 4）：h-14，不参与滚动（sticky top-0）、无阴影。
 * 左：面包屑（所在分组 / 当前页）——跟随侧栏「主/副站切换器」联动；
 * 右：主副站标识 + 当前管理员。
 * 字号统一 12/400（text-xs font-normal；admin-scope 不收 text-xs），不引入新字号档。
 * H1 仍由内容区的 AdminPageContainer 渲染（24/600），此处不重复大标题。
 */
export function AdminTopBar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [site, setSite] = useState<SiteKey>(() =>
    pathname.startsWith("/admin/galvelica") ? "galvelica" : "circleica",
  )

  // 与侧栏切换器联动：AdminNav 切换时写 data-admin-site 并广播 admin-site-view
  useEffect(() => {
    const sync = () => {
      const d = document.documentElement.dataset.adminSite
      if (d === "galvelica" || d === "circleica") setSite(d)
      else setSite(pathname.startsWith("/admin/galvelica") ? "galvelica" : "circleica")
    }
    sync()
    window.addEventListener("admin-site-view", sync)
    return () => window.removeEventListener("admin-site-view", sync)
  }, [pathname])

  const nav = resolveAdminNavItem(pathname)
  const firstSegment = site === "galvelica" ? "Galvelica" : (nav?.groupLabel ?? "后台")
  const pageLabel = nav?.label ?? "后台"

  const name = session?.user?.name ?? "管理员"
  const image = session?.user?.image ?? null

  return (
    <div className="sticky top-14 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 text-xs font-normal backdrop-blur sm:px-8 md:top-0">
      {/* 左：面包屑 */}
      <nav aria-label="面包屑" className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <span className="truncate">{firstSegment}</span>
        <span className="text-muted-foreground/40">/</span>
        <span className="truncate text-foreground">{pageLabel}</span>
      </nav>

      {/* 右：当前管理员（主副站信息已由面包屑第一段承担，此处不再重复站名） */}
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
