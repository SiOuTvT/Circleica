"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { GalvelicaSearch } from "./galvelica-search"
import { GalvelicaRandomLink } from "./galvelica-random-link"
import { ThemeModeToggle } from "./theme-mode-toggle"
import { GalvelicaNsfwToggle } from "./galvelica-nsfw-toggle"
import { GalvelicaCommercialToggle } from "./galvelica-commercial-toggle"
import { GalvelicaBackLink } from "./back-link"

const NAV_ITEMS = [
  { label: "总览", href: "/galvelica", countKey: null as null | keyof RailCounts },
  { label: "作品库", href: "/galvelica/works", countKey: "works" as const },
  { label: "标签", href: "/galvelica/tags", countKey: "tags" as const },
  { label: "年份", href: "/galvelica/years", countKey: "years" as const },
  { label: "社团", href: "/galvelica/studios", countKey: "studios" as const },
]

type RailCounts = { works: number; tags: number; years: number; studios: number; total: number }

/**
 * 副站左栏：品牌 / 随机 / 检索 / 导航（带计数）/ 过滤影响说明 / 底部开关区。
 * 桌面常驻显示；窄屏（<1024px）收进抽屉，由顶部「导航与筛选」按钮唤出，
 * 避免左栏整块堆在内容上方占掉首屏。
 */
export function GalvelicaRail({ counts }: { counts: RailCounts }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // 路由变化后自动收起：移动端点导航跳转后抽屉不该还盖在内容上
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      {/* 窄屏入口（桌面由 CSS 隐藏） */}
      <button
        type="button"
        className="galvelica-rail-open"
        onClick={() => setOpen(true)}
        aria-label="打开导航与筛选"
        aria-expanded={open}
      >
        <Menu className="h-4 w-4" strokeWidth={2} />
        <span>导航与筛选</span>
      </button>

      {/* 遮罩：点击关闭（仅展开时渲染） */}
      {open ? (
        <div className="galvelica-rail-scrim" onClick={() => setOpen(false)} aria-hidden />
      ) : null}

      <aside className="galvelica-rail" data-open={open}>
        {/* 关闭按钮（桌面由 CSS 隐藏） */}
        <button
          type="button"
          className="galvelica-rail-close"
          onClick={() => setOpen(false)}
          aria-label="关闭导航与筛选"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        {/* ① 品牌行 */}
        <div className="galvelica-rail-brand">
          <span className="name">Galvelica</span>
          <span className="sub">ARCHIVE</span>
        </div>

        {/* ② 随机：独立动作按钮（与开关区同族：无圆角无阴影，hover 只变色） */}
        <GalvelicaRandomLink label="随机翻开一部" className="galvelica-rail-action" />

        {/* ③ 检索（只要输入框，不要按钮）
            作品库页内容区已有带筛选保留的检索框（hiddenFields + 检索按钮），
            此处不再重复渲染，避免同页出现两个搜索框 */}
        {pathname !== "/galvelica/works" && (
          <div className="galvelica-rail-search">
            <GalvelicaSearch placeholder="检索作品、社团、原名" />
          </div>
        )}

        {/* ④ 导航：五个页面入口 */}
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
        </nav>

        {/* ⑤ 过滤影响：切换开关后可见总数会变，这里说明被过滤掉多少，避免误认为数据出错 */}
        {counts.total > counts.works ? (
          <p className="galvelica-rail-filternote">
            已按当前设置过滤掉 {counts.total - counts.works} 部
          </p>
        ) : null}

        {/* ⑥ 底部开关区 */}
        <div className="galvelica-rail-switches">
          <ThemeModeToggle />
          <GalvelicaNsfwToggle />
          <GalvelicaCommercialToggle />
          <GalvelicaBackLink site />
        </div>
      </aside>
    </>
  )
}
