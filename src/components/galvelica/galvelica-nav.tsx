"use client"

import Link from "next/link"
import Image from "next/image"
import { BRANDING, resolveLogo, type LogoMode } from "@/lib/branding"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Compass, Layers, Library, Tags, CalendarRange, Users } from "lucide-react"

const NAV_ITEMS = [
  { icon: Library, label: "首页", href: "/galvelica" },
  { icon: Layers, label: "浏览", href: "/galvelica/works" },
  { icon: Tags, label: "标签", href: "/galvelica/tags" },
  { icon: CalendarRange, label: "年份", href: "/galvelica/years" },
  { icon: Users, label: "社团", href: "/galvelica/studios" },
  { icon: Compass, label: "随机", href: "/galvelica/random" },
]

export function GalvelicaNav({ className, logoMode = "full" }: { className?: string; logoMode?: LogoMode }) {
  const pathname = usePathname()
  // 副站始终使用 galvelica emblem（自定义 site_logo 仅主站生效），按 logo_mode 决定是否显示站名
  const brand = resolveLogo(logoMode, { emblem: BRANDING.galvelica.emblem })
  return (
    <nav className={cn("flex flex-wrap items-center gap-1", className)}>
      {/* 副站品牌标识：点击返回 Galvelica 首页 */}
      <Link
        href="/galvelica"
        aria-label="Galvelica 首页"
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/60"
      >
        <Image
          src={brand.imageSrc}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="h-8 w-8 shrink-0"
        />
        {brand.showName && (
          <span className="text-lg font-bold tracking-tight font-heading text-[var(--gal-accent)]">Galvelica</span>
        )}
      </Link>
      {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
        const active =
          href === "/galvelica"
            ? pathname === "/galvelica"
            : pathname === href || pathname.startsWith(href + "/")
        return (
          <Link
            key={href}
            href={href}
            data-active={active}
            className="galvelica-navlink flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap"
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
