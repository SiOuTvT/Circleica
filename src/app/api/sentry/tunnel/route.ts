import { withHandler, json } from "@/lib/api-handler"
import { NextResponse } from "next/server"

const SENTRY_HOST = "sentry.io"
const ALLOWED_SENTRY_PATHS = ["/api/", "/envelope/"]

export const POST = withHandler(async (req) => {
  const envelope = await req.text()
  const piece = envelope.split("\n")[0]
  const header = JSON.parse(piece)

  const dsn = new URL(header.dsn)
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

  const response = await fetch(sentryUrl, {
    method: "POST",
    body: envelope,
    headers: {
      "Content-Type": "application/x-sentry-envelope",
    },
  })

  return new NextResponse(response.body, {
    status: response.status,
  })
})
