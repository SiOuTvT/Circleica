import Link from "next/link"
import type { GalvelicaWorkCard } from "@/lib/galvelica"
import { GalvelicaCover } from "./galvelica-cover"

/**
 * 副站「一条作品 = 一行」：书脊 + 封面 + 文字列 + 右端信息。
 * 无 border / border-radius / box-shadow / 位移 / 缩放；hover 仅背景与标题变色。
 * 元信息用 gap 分隔，禁止任何分隔符字符。
 */
export function GalvelicaEntryRow({
  work,
  desc,
  priority,
  showTags = true,
}: {
  work: GalvelicaWorkCard
  desc?: boolean
  /** 前 N 张封面用 priority 加载（来自 WorkGrid 的 priorityCount） */
  priority?: boolean
  /** 右端「N 个标签」行是否渲染；默认渲染 */
  showTags?: boolean
}) {
  return (
    <Link href={work.href} className="galvelica-entry">
      <span className="galvelica-entry-spine" aria-hidden />
      <GalvelicaCover src={work.coverImage} alt={work.title} size="sm" priority={priority} />
      <span className="galvelica-entry-body">
        <span className="galvelica-entry-title">{work.title}</span>
        <span className="galvelica-entry-meta">
          <span className="galvelica-entry-studio">{work.studioName || "未知社团"}</span>
          {work.releaseYear ? <span>{work.releaseYear}</span> : null}
          {work.originalWork ? <span>{work.originalWork}</span> : null}
        </span>
        {desc && work.description ? (
          <span className="galvelica-entry-desc">{work.description}</span>
        ) : null}
      </span>
      <span className="galvelica-entry-side">
        <span className="galvelica-entry-year">{work.releaseYear ?? ""}</span>
        {showTags && <span className="galvelica-entry-tagcount">{work.tags.length} 个标签</span>}
      </span>
    </Link>
  )
}
