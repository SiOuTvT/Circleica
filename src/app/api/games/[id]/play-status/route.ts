// 游玩状态功能已移除（PlayStatus 系统下线），此端点保留但恒返回 404。
import { withHandler } from "@/lib/api-handler"
import { NotFoundError } from "@/lib/errors"

export const GET = withHandler(async () => {
  throw new NotFoundError("游玩状态功能已下线")
})

export const POST = withHandler(async () => {
  throw new NotFoundError("游玩状态功能已下线")
})
