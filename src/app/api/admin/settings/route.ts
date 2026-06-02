import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

// GET /api/admin/settings — 获取所有站点配置
export async function GET() {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  try {
    const settings = await prisma.siteSetting.findMany()
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]))
    return NextResponse.json(map)
  } catch (error) {
    console.error("获取站点配置失败:", error)
    return NextResponse.json({ error: "获取失败" }, { status: 500 })
  }
}

// PUT /api/admin/settings — 批量更新站点配置
export async function PUT(req: NextRequest) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  try {
    const body = await req.json()
    // body 是 { key: value, ... } 的对象
    const entries = Object.entries(body).filter(([k]) => typeof k === "string")

    for (const [key, value] of entries) {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value: String(value ?? "") },
        create: { key, value: String(value ?? "") },
      })
    }

    revalidateTag("site-settings", "max")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("更新站点配置失败:", error)
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}