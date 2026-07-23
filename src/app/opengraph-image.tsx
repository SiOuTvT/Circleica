import { ImageResponse } from "next/og"

// 构建期跳过 prerender — ImageResponse 内部 fetch 字体在 Docker 构建环境会超时
export const dynamic = "force-dynamic"

export const alt = "Circleica · 资源大厅"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OGImage() {
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
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎮</div>
        <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1 }}>
          Circleica
        </div>
        <div style={{ fontSize: 24, color: "#E0A87C", marginTop: 12 }}>
          资源大厅 · 下载 · 评论 · 收藏
        </div>
      </div>
    ),
    { ...size }
  )
}
