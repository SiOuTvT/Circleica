import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { ok, serverError, unauthorized } from "@/lib/api-response"
import { NextRequest } from "next/server"

// GET /api/admin/checkin-config - 获取签到配置
async function handleGet() {
  try {
    const [title, subtitle, imageUrl] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "checkin_title" } }),
      prisma.siteSetting.findUnique({ where: { key: "checkin_subtitle" } }),
      prisma.siteSetting.findUnique({ where: { key: "checkin_image_url" } }),
    ])

    return ok({
      title: title?.value ?? "签到成功",
      subtitle: subtitle?.value ?? "获得 {marks} 印记",
      imageUrl: imageUrl?.value ?? "",
    })
  } catch (error) {
    return serverError("获取配置失败")
  }
}

// POST /api/admin/checkin-config - 更新签到配置
async function handlePost(req: NextRequest) {
  try {
    await requireAdmin()
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

    return ok({ success: true })
  } catch (error) {
    return serverError("保存配置失败")
  }
}

export { handleGet as GET, handlePost as POST }