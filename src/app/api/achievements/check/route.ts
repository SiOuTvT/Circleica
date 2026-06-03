import { auth } from "@/lib/auth"
import { checkAchievements } from "@/lib/achievements"
import { NextResponse } from "next/server"

/**
 * POST: 手动触发成就检查（也可由其他 API 内部调用 checkAchievements）
 */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const unlocked = await checkAchievements(session.user.id)
  return NextResponse.json({ unlocked })
}
