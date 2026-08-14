import { NextResponse } from "next/server"
import { getContributors } from "@/lib/github"
import { logger } from "@/lib/logger"
import { withHandler } from "@/lib/api-handler"

export const GET = withHandler(async () => {
  try {
    const contributors = await getContributors()
    return NextResponse.json(contributors)
  } catch (error) {
    // GitHub 不可达时降级为空列表（不抛 5xx），避免阻塞页面渲染
    logger.api.error("[Contributors] 获取贡献者失败，降级为空", error)
    return NextResponse.json([], { status: 200 })
  }
})
