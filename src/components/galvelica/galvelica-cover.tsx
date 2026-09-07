import { SafeImage } from "@/components/safe-image"

/**
 * 副站 3:4 封面（右上斜切口）。
 * size: sm=宽 62px（条目行）/ lg=宽 132px（今日偶遇）。
 * 无封面兜底：标题首字（serif）+「暂无封面」小字，与主站 WorkCard 一致。
 * 注意：封面不缩放（无 transition-transform / group-hover:scale），副站新语言里封面静止。
 */
export function GalvelicaCover({
  src,
  alt,
  size = "sm",
  className,
  priority,
}: {
  src?: string
  alt: string
  size?: "sm" | "lg" | "xl"
  className?: string
  priority?: boolean
}) {
  const w = size === "xl" ? 208 : size === "lg" ? 132 : 62
  // 兜底首字也走字号档位：26 / 22 / 18（xl / lg / sm）
  const glyphSize = size === "xl" ? 26 : size === "lg" ? 22 : 18
  return (
    <div className={`galvelica-cover${className ? ` ${className}` : ""}`} style={{ width: w }}>
      {src ? (
        <SafeImage
          src={src}
          alt={alt}
          fill
          priority={priority}
          className="object-cover"
          sizes={size === "xl" ? "208px" : size === "lg" ? "132px" : "62px"}
        />
      ) : (
        <div className="galvelica-cover-empty">
          <span className="initial" style={{ fontSize: glyphSize }}>
            {(alt || "?").trim().charAt(0).toUpperCase()}
          </span>
          <span className="label">暂无封面</span>
        </div>
      )}
    </div>
  )
}
