"use client"

import Link from "next/link"
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

export function GalvelicaNav({ className }: { className?: string }) {
  const pathname = usePathname()
  return (
    <nav className={cn("flex flex-wrap items-center gap-1", className)}>
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
