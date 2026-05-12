import { getSiteSettings } from "@/lib/site-settings"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const settings = await getSiteSettings()
  return NextResponse.json(settings)
}