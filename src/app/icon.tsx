import { ImageResponse } from "next/og"

// 构建期跳过 prerender — ImageResponse 内部 fetch 字体在 Docker 构建环境会超时
export const dynamic = "force-dynamic"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: "#E0A87C",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: 8,
        }}
      >
        🎮
      </div>
    ),
    { ...size }
  )
}
