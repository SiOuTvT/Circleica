/**
 * 签到配置（公开）— 仅返回展示用字段，不含管理信息
 */
import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { cache } from "@/lib/redis"

export const GET = withHandler(async () => {
  const cacheKey = "checkin:config:public"
  const cached = await cache.get<{ title: string; subtitle: string; imageUrl: string }>(cacheKey)
  if (cached) return json(cached)

  const [title, subtitle, imageUrl] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "checkin_title" } }),
    prisma.siteSetting.findUnique({ where: { key: "checkin_subtitle" } }),
    prisma.siteSetting.findUnique({ where: { key: "checkin_image_url" } }),
  ])

  const data = {
    title: title?.value ?? "签到成功",
    subtitle: subtitle?.value ?? "获得 {marks} 印记",
    imageUrl: imageUrl?.value ?? "",
  }
  await cache.set(cacheKey, data, 3600)
  return json(data)
})
