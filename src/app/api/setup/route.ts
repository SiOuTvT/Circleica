import { badRequest, conflict, created, serverError } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { revalidateTag } from "next/cache"
import bcrypt from "bcryptjs"
import { serialIdToUid } from "@/lib/serial-id"

interface SetupBody {
  siteName: string
  siteDescription?: string
  siteLogo?: string
  placeholderImage?: string
  registrationEnabled: boolean
  admin: {
    username: string
    email: string
    password: string
  }
}

export async function POST(req: Request) {
  let body: SetupBody
  try {
    body = await req.json()
  } catch {
    return badRequest("请求格式错误")
  }

  const { siteName, admin } = body
  if (!siteName?.trim()) return badRequest("网站名称不能为空")
  if (!admin?.username?.trim()) return badRequest("管理员用户名不能为空")
  if (!admin?.email?.trim()) return badRequest("管理员邮箱不能为空")
  if (!admin?.password || admin.password.length < 8) return badRequest("密码至少 8 个字符")

  try {
    const hashed = await bcrypt.hash(admin.password, 10)

    // Serializable 事务：原子性检查 + 创建，杜绝并发初始化
    const result = await prisma.$transaction(async (tx) => {
      // 事务内检查（受隔离级别保护，并发请求会串行执行到这里）
      const initialized = await tx.siteSetting.findUnique({
        where: { key: "initialized" },
        select: { value: true },
      })
      if (initialized?.value === "true") {
        return { error: "already_initialized" as const }
      }
      const userCount = await tx.user.count()
      if (userCount > 0) {
        return { error: "already_initialized" as const }
      }

      const newUser = await tx.user.create({
        data: {
          username: admin.username.trim(),
          email: admin.email.trim().toLowerCase(),
          password: hashed,
          role: "SUPER_ADMIN",
        },
        select: { id: true, serialId: true },
      })

      const uid = serialIdToUid(newUser.serialId)
      await tx.user.update({
        where: { id: newUser.id },
        data: { uid },
      })

      const settings: Array<{ key: string; value: string }> = [
        { key: "initialized", value: "true" },
        { key: "site_name", value: siteName.trim() },
        { key: "site_description", value: (body.siteDescription || "").trim() },
        { key: "site_logo", value: body.siteLogo || "" },
        { key: "default_placeholder_image", value: body.placeholderImage || "" },
        { key: "registration_enabled", value: String(body.registrationEnabled ?? true) },
      ]

      for (const s of settings) {
        await tx.siteSetting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: s,
        })
      }

      return { user: newUser }
    }, { isolationLevel: "Serializable" })

    if ("error" in result) {
      return conflict("站点已完成初始化")
    }

    revalidateTag("site-settings", "max")

    return created({
      userId: result.user.id,
      username: admin.username.trim(),
      email: admin.email.trim().toLowerCase(),
    })
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return conflict("用户名或邮箱已被使用")
    }
    return serverError("初始化失败，请稍后再试")
  }
}
