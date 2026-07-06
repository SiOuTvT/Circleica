import { getAdminSession } from "@/lib/admin"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"
import { NextRequest, NextResponse } from "next/server"

/**
 * 站点配置 API（兼容旧接口）
 * 内部委托给 /api/admin/site-settings 相同的工具函数
 * 新代码建议直接使用 /api/admin/site-settings
 */

// 允许通过此端点修改的配置键名白名单
const ALLOWED_KEYS = new Set([
  "default_placeholder_image",
  "site_name",
  "site_description",
  "site_logo",
  "registration_enabled",
])

// GET /api/admin/settings — 获取所有站点配置
export async function GET() {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  try {
    const settings = await getSiteSettings()
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: "获取失败" }, { status: 500 })
  }
}

// PUT /api/admin/settings — 批量更新站点配置
export async function PUT(req: NextRequest) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  try {
    const body = await req.json()
    const filtered = Object.fromEntries(
      Object.entries(body).filter(
        ([k, v]) => ALLOWED_KEYS.has(k) && (typeof v === "string" || typeof v === "boolean" || typeof v === "number")
      ).map(([k, v]) => [k, String(v)])
    )
    await updateSiteSettings(filtered)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}
