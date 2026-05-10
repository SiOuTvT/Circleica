import { vndbClient } from "@/lib/vndb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== 开始获取随机创作者（VNDB Staff） ===")
    
    const creator = await vndbClient.getRandomStaffMember()
    
    if (creator) {
      console.log("✓ 从 VNDB 获取到创作者:", creator.name, "ID:", creator.id)
      
      return NextResponse.json({
        id: creator.id,
        name: creator.name,
        original: creator.original || "",
        description: creator.description || "",
        gender: creator.gender || "",
        vndbId: creator.vndbId || "",
        roles: creator.roles || [],
        vns: creator.vns || [],
        source: "vndb",
      })
    }

    console.error("✗ VNDB 未返回创作者数据")
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