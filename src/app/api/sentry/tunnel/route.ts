import { withHandler, json } from "@/lib/api-handler"
import { NextResponse } from "next/server"

const SENTRY_HOST = "sentry.io"
const ALLOWED_SENTRY_PATHS = ["/api/", "/envelope/"]

export const POST = withHandler(async (req) => {
  const envelope = await req.text()
  const piece = envelope.split("\n")[0]

  let header: { dsn?: string }
  try {
    header = JSON.parse(piece)
  } catch {
    return json({ error: "Invalid envelope" }, 400)
  }

  if (!header.dsn || typeof header.dsn !== "string") {
    return json({ error: "Missing DSN" }, 400)
  }

  let dsn: URL
  try {
    dsn = new URL(header.dsn)
  } catch {
    return json({ error: "Invalid DSN" }, 400)
  }

  const isAllowedDsn = dsn.hostname === SENTRY_HOST || dsn.hostname.endsWith(`.${SENTRY_HOST}`)

  if (!isAllowedDsn) {
    return json({ error: "Invalid DSN" }, 400)
  }

  const isAllowedPath = ALLOWED_SENTRY_PATHS.some((path) =>
    dsn.pathname.includes(path),
  )

  if (!isAllowedPath) {
    return json({ error: "Invalid path" }, 400)
  }

  const projectId = dsn.pathname.replace("/", "")
  const sentryUrl = `https://${dsn.hostname}/api/${projectId}/envelope/`

  try {
    const upstream = await fetch(sentryUrl, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      body: envelope,
      headers: {
        "Content-Type": "application/x-sentry-envelope",
      },
    })

    // 缓冲上游响应体后再返回，避免直接透传 ReadableStream 时因上游断连触发
    // "failed to pipe response"（源站网络受限时 sentry.io 会中途断开）。
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch {
    // sentry.io 不可达（如源站被墙/超时）时静默丢弃，返回 200 避免污染服务端错误日志与误报 500。
    // 错误上报失败不影响主应用，浏览器端 beacon 收到 200 即认为成功。
    return new NextResponse(null, { status: 200 })
  }
})
