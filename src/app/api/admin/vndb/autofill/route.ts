import { NextRequest, NextResponse } from "next/server"
import { vndbClient } from "@/lib/vndb"
import { getAdminSession } from "@/lib/admin"

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

    // 从 VNDB 自动填充信息
    const data = await vndbClient.autoFillFromVNDB(vndbId)

    if (!data) {
      return NextResponse.json(
        { error: "未找到该 VNDB ID 对应的作品" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      title: data.title,
      original: data.original,
      tags: data.tags,
      creators: data.creators,
      message: "✓ 成功从 VNDB 获取信息",
    })
  } catch (error) {
    console.error("VNDB auto-fill error:", error)
    return NextResponse.json(
      { error: "自动填充失败，请稍后重试" },
      { status: 500 }
    )
  }
}
