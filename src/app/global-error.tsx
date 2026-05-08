"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 将错误上报到 Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, -apple-system, sans-serif",
            background: "#0a0a0a",
            color: "#e5e5e5",
            padding: "2rem",
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: "3rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
                background: "linear-gradient(135deg, #ff6b6b, #ffa500)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              出错了
            </h1>
            <p
              style={{
                fontSize: "1.125rem",
                color: "#a3a3a3",
                marginBottom: "2rem",
                lineHeight: 1.6,
              }}
            >
              页面遇到了一个意外错误。我们已经记录了这个问题，请尝试刷新页面。
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button
                onClick={reset}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#3b82f6",
                  color: "white",
                  fontSize: "1rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                重试
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #404040",
                  background: "transparent",
                  color: "#e5e5e5",
                  fontSize: "1rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                返回首页
              </button>
            </div>
            {process.env.NODE_ENV === "development" && (
              <details
                style={{
                  marginTop: "2rem",
                  textAlign: "left",
                  background: "#1a1a1a",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #333",
                  overflow: "auto",
                }}
              >
                <summary style={{ cursor: "pointer", color: "#a3a3a3", marginBottom: "0.5rem" }}>
                  错误详情（仅开发环境）
                </summary>
                <pre
                  style={{
                    fontSize: "0.875rem",
                    color: "#ef4444",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}