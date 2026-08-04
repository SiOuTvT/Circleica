import { ImageResponse } from "next/og"
import fs from "node:fs"
import path from "node:path"

// 构建期跳过 prerender — 无需 fetch 字体（用系统字体），emblem 由运行时从本地磁盘读取
export const dynamic = "force-dynamic"

export const alt = "Circleica · 资源大厅"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// 运行时从 public/branding 读取反白 emblem（深色背景用），内联为 base64，
// 避免构建期/运行时网络请求。读取失败则降级为纯文字，不影响 OG 生成。
let _emblemUri: string | null | undefined
function getEmblemUri(): string | null {
  if (_emblemUri !== undefined) return _emblemUri
  try {
    const p = path.join(process.cwd(), "public", "branding", "circleica-emblem-white.png")
    _emblemUri = `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`
  } catch {
    _emblemUri = null
  }
  return _emblemUri
}

export default function OGImage() {
  const emblem = getEmblemUri()
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: "linear-gradient(135deg, #08080a 0%, #151518 50%, #1a1a1e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#e8e8ec",
          fontFamily: "sans-serif",
        }}
      >
        {emblem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={emblem} width={150} height={150} alt="" style={{ marginBottom: 12 }} />
        ) : (
          <div style={{ fontSize: 64, marginBottom: 16 }}>✦</div>
        )}
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>
          Circleica
        </div>
        <div style={{ fontSize: 24, color: "#4C7E96", marginTop: 12 }}>
          资源大厅 · 下载 · 评论 · 收藏
        </div>
      </div>
    ),
    { ...size }
  )
}
