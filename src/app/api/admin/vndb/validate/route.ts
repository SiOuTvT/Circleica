import { getAdminSession } from "@/lib/admin"
import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { vndbClient } from "@/lib/vndb"

export async function POST(req: NextRequest) {
  // 需要管理员权限
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "未授权访问" }, { status: 403 })
  }

  try {
    const { vndbId } = await req.json()

    if (!vndbId) {
      return NextResponse.json(
        { error: "请提供 VNDB ID" },
        { status: 400 }
      )
    }

    // 验证 VNDB ID 格式（应该是纯数字）
    if (!/^\d+$/.test(vndbId)) {
      return NextResponse.json(
        { error: "VNDB ID 格式不正确" },
        { status: 400 }
      )
    }

    // 调用 VNDB API 验证
    const result = await vndbClient.validateDoujinWork(vndbId)

    if (!result.isValid) {
      return NextResponse.json(
        { error: "未找到该 VNDB ID 对应的作品" },
        { status: 404 }
      )
    }

    // 返回验证结果
    return NextResponse.json({
      valid: true,
      isDoujin: result.isDoujin,
      title: result.title,
      tags: result.tags,
      message: result.isDoujin 
        ? "✓ 确认为同人作品" 
        : "⚠ 未检测到同人标签，但仍可发布",
    })
  } catch (error) {
    logger.db.error("VNDB validation error", error)
    return NextResponse.json(
      { error: "验证失败，请稍后重试" },
      { status: 500 }
    )
  }
}
