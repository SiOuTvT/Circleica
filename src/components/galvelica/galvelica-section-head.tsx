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
  note,
}: {
  title: string
  count?: string
  href?: string
  hrefLabel?: string
  /**
   * 计数口径说明：一行小字，跟在区块头下面（用负 margin 吃掉区块头的一部分下边距，
   * 不新增纵向留白）。只在计数容易与其它位置的数字对不上时才传。
   */
  note?: string
}) {
  return (
    <div>
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
      {note ? (
        <p className="galvelica-fs-meta -mt-2 mb-4 text-muted-foreground">{note}</p>
      ) : null}
    </div>
  )
}
