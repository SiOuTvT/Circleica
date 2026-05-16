import { getAdminSession } from "@/lib/admin"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"
import { NextResponse } from "next/server"

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const settings = await getSiteSettings()
  return NextResponse.json(settings)
}

export async function POST(req: Request) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const body = await req.json()
  const updated = await updateSiteSettings(body)
  return NextResponse.json(updated)
}
