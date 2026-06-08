import { getAdminSession } from "@/lib/admin"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"
import { NextResponse } from "next/server"

export async function GET() {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const settings = await getSiteSettings()
  return NextResponse.json(settings)
}

export async function POST(req: Request) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  const updated = await updateSiteSettings(body)
  return NextResponse.json(updated)
}
