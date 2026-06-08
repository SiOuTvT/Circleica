import { auth } from "@/lib/auth"
import { checkAchievements } from "@/lib/achievements"
import { NextResponse } from "next/server"

/**
 * POST: 手动触发成就检查（也可由其他 API 内部调用 checkAchievements）
 */
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

    const unlocked = await checkAchievements(session.user.id)
    return NextResponse.json({ unlocked })
  } catch (error) {
    console.error("[Achievements Check]", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
