"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { GalvelicaSearch } from "./galvelica-search"
import { GalvelicaRandomLink } from "./galvelica-random-link"
import { ThemeModeToggle } from "./theme-mode-toggle"
import { GalvelicaNsfwToggle } from "./galvelica-nsfw-toggle"
import { GalvelicaRealFilterToggle } from "./galvelica-real-filter-toggle"
import { GalvelicaBackLink } from "./back-link"

const NAV_ITEMS = [
  { label: "总览", href: "/galvelica", countKey: null as null | keyof RailCounts },
  { label: "作品库", href: "/galvelica/works", countKey: "works" as const },
  { label: "标签", href: "/galvelica/tags", countKey: "tags" as const },
  { label: "年份", href: "/galvelica/years", countKey: "years" as const },
  { label: "社团", href: "/galvelica/studios", countKey: "studios" as const },
]

type RailCounts = { works: number; tags: number; years: number; studios: number }

/**
 * 副站左栏：品牌 / 检索 / 导航（带计数）/ 底部开关区（主题·SFW·真人3D·返回主站）。
 * 沿用现有控件，只换位置不换逻辑；六项功能一个都不丢。
 */
export function GalvelicaRail({ counts }: { counts: RailCounts }) {
  const pathname = usePathname()
  return (
    <aside className="galvelica-rail">
      {/* ① 品牌行 */}
      <div className="galvelica-rail-brand">
        <span className="name">Galvelica</span>
        <span className="sub">ARCHIVE</span>
      </div>

      {/* ② 检索（只要输入框，不要按钮） */}
      <div className="galvelica-rail-search">
        <GalvelicaSearch placeholder="检索作品、社团、原名" />
      </div>

      {/* ③ 导航 */}
      <nav className="galvelica-rail-nav">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/galvelica"
              ? pathname === "/galvelica"
              : pathname === item.href || pathname.startsWith(item.href + "/")
          const c = item.countKey ? counts[item.countKey] : null
          return (
            <Link key={item.href} href={item.href} data-active={active}>
              <span>{item.label}</span>
              {c != null && <small className="num">{c}</small>}
            </Link>
          )
        })}
        <GalvelicaRandomLink label="随机翻开一部" className="galvelica-rail-random" />
      </nav>

      {/* ④ 底部开关区 */}
      <div className="galvelica-rail-switches">
        <ThemeModeToggle />
        <GalvelicaNsfwToggle />
        <GalvelicaRealFilterToggle />
        <GalvelicaBackLink site />
      </div>
    </aside>
  )
}
