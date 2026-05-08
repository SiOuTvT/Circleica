import { vndbClient } from "@/lib/vndb"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== 开始获取随机创作者（VNDB Staff） ===")
    
    const staff = await vndbClient.getRandomStaffMember()
    
    if (staff) {
      console.log("✓ 从 VNDB 获取到创作者:", staff.name, "ID:", staff.vndbId, "角色:", staff.roles)
      
      return NextResponse.json({
        id: `vndb-${staff.vndbId}`,
        name: staff.name,
        nameJa: staff.original || staff.name,
        avatar: "",
        vndbId: staff.vndbId,
        type: "staff",
        description: staff.description || "",
        gender: staff.gender || "",
        roles: staff.roles,
        vns: staff.vns,
        source: "vndb",
      })
    }

    // 降级到 producer
    console.log("Staff 获取失败，降级到 producer...")
    const vndbCreator = await vndbClient.getRandomDoujinCreator()
    
    if (vndbCreator) {
      return NextResponse.json({
        id: `vndb-${vndbCreator.vndbId}`,
        name: vndbCreator.name,
        nameJa: vndbCreator.original || vndbCreator.name,
        avatar: vndbCreator.image || "",
        vndbId: vndbCreator.vndbId,
        type: vndbCreator.type || "individual",
        description: vndbCreator.description || "",
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