import Link from "next/link"

/**
 * 副站统一「返回」链接：左侧箭头 + 文案，样式对齐导航项。
 * - 站内返回：<GalvelicaBackLink href="/galvelica/works" label="作品档案" />
 * - 返回主站：<GalvelicaBackLink site />（文案固定「返回 Circleica」，对齐 Header/Footer）
 */
export function GalvelicaBackLink({ href, label, site, className }: { href?: string; label?: string; site?: boolean; className?: string }) {
  const to = site ? "/" : href ?? "/galvelica"
  const text = site ? "返回 Circleica" : label ?? "返回"
  return (
    <Link
      href={to}
      className={`galvelica-navlink inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium${className ? ` ${className}` : ""}`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
      {text}
    </Link>
  )
}
