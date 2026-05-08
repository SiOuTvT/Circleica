import { NextRequest, NextResponse } from "next/server"

const SENTRY_HOST = "sentry.io"
const ALLOWED_SENTRY_PATHS = ["/api/", "/envelope/"]

export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text()
    const piece = envelope.split("\n")[0]
    const header = JSON.parse(piece)

    const dsn = new URL(header.dsn)
    const isAllowedDsn = dsn.hostname.endsWith(SENTRY_HOST)

    if (!isAllowedDsn) {
      return NextResponse.json({ error: "Invalid DSN" }, { status: 400 })
    }

    const isAllowedPath = ALLOWED_SENTRY_PATHS.some((path) =>
      dsn.pathname.includes(path)
    )

    if (!isAllowedPath) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
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
  } catch {
    return NextResponse.json(
      { error: "Tunnel error" },
      { status: 500 }
    )
  }
}