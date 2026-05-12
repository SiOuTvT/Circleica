import { auth } from "@/lib/auth"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const settings = await getSiteSettings()
  return NextResponse.json(settings)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const updated = await updateSiteSettings(body)
  return NextResponse.json(updated)
}