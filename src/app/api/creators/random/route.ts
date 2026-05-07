import { vndbClient } from "@/lib/vndb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== 开始获取随机创作者（VNDB） ===")
    
    const vndbCreator = await vndbClient.getRandomDoujinCreator()
    
    if (vndbCreator) {
      console.log("✓ 从 VNDB 获取到创作者:", vndbCreator.name, "ID:", vndbCreator.vndbId)
      
      return NextResponse.json({
        id: `vndb-${vndbCreator.vndbId}`,
        name: vndbCreator.name,
        nameJa: vndbCreator.original || vndbCreator.name,
        avatar: vndbCreator.image || "",
        vndbId: vndbCreator.vndbId,
        source: "vndb",
      })
    }

    console.error("✗ VNDB 未返回数据")
    return NextResponse.json(
      { error: "暂无创作者数据，请稍后重试" },
      { status: 404 }
    )
  } catch (error) {
    console.error("✗ Failed to get random creator:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "获取失败",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}