import Link from "next/link"

/**
 * 副站区块头：标题 + 可选计数 + 右侧延伸细线 + 可选「更多」链接。
 * 线只出现在标题右侧、延伸到内容边缘（不用 .galvelica-rule 渐变装饰线，也不标题下画通栏线）。
 */
export function GalvelicaSectionHead({
  title,
  count,
  href,
  hrefLabel,
}: {
  title: string
  count?: string
  href?: string
  hrefLabel?: string
}) {
  return (
    <div className="galvelica-section-head">
      <h2>{title}</h2>
      {count ? <span className="galvelica-section-count">{count}</span> : null}
      <div className="galvelica-sechead-line" />
      {href ? (
        <Link href={href} className="galvelica-section-more">
          {hrefLabel}
        </Link>
      ) : null}
    </div>
  )
}
