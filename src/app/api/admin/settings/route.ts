import { getAdminSession } from "@/lib/admin"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

/**
 * 站点配置 API
 *
 * ⚠️ 注意：此端点与 /api/admin/site-settings 功能重复。
 * - /api/admin/settings — 直接操作 prisma，有键名白名单
 * - /api/admin/site-settings — 使用 site-settings.ts 工具函数
 *
 * 两者都被前端使用，暂保留两份。未来应统一为一个。
 */

// 允许通过此端点修改的配置键名白名单
const ALLOWED_KEYS = new Set([
  "default_placeholder_image",
  "site_name",
  "site_description",
  "registration_enabled",
])

// GET /api/admin/settings — 获取所有站点配置
export async function GET() {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  try {
    const settings = await prisma.siteSetting.findMany()
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]))
    return NextResponse.json(map)
  } catch (error) {
    logger.db.error("获取站点配置失败", error)
    return NextResponse.json({ error: "获取失败" }, { status: 500 })
  }
}

// PUT /api/admin/settings — 批量更新站点配置
export async function PUT(req: NextRequest) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  try {
    const body = await req.json()
    const entries = Object.entries(body).filter(
      ([k, v]) => typeof k === "string" && ALLOWED_KEYS.has(k) && (typeof v === "string" || typeof v === "boolean" || typeof v === "number")
    )

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
    logger.db.error("更新站点配置失败", error)
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}