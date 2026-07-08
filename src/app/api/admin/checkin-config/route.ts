import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { cache } from "@/lib/redis"

export const GET = withHandler(async () => {
  const cacheKey = "checkin:config"
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

export const POST = withHandler(async (req) => {
  await requireAdminRole()
  const body = await req.json()
  const { title, subtitle, imageUrl } = body

  await Promise.all([
    prisma.siteSetting.upsert({
      where: { key: "checkin_title" },
      create: { key: "checkin_title", value: title ?? "签到成功" },
      update: { value: title ?? "签到成功" },
    }),
    prisma.siteSetting.upsert({
      where: { key: "checkin_subtitle" },
      create: { key: "checkin_subtitle", value: subtitle ?? "获得 {marks} 印记" },
      update: { value: subtitle ?? "获得 {marks} 印记" },
    }),
    prisma.siteSetting.upsert({
      where: { key: "checkin_image_url" },
      create: { key: "checkin_image_url", value: imageUrl ?? "" },
      update: { value: imageUrl ?? "" },
    }),
  ])

  await cache.del("checkin:config")
  return json({ success: true })
})
