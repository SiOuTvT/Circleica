import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { revalidateTag } from "next/cache"
import bcrypt from "bcryptjs"
import { serialIdToUid } from "@/lib/serial-id"
import { ConflictError, ValidationError, ForbiddenError } from "@/lib/errors"
import { validatePassword } from "@/lib/password"

interface SetupBody {
  siteName: string
  siteDescription?: string
  siteLogo?: string
  logoMode?: string
  placeholderImage?: string
  registrationEnabled: boolean
  themeColor?: string
  tagGroupColors?: Record<string, string>
  admin: {
    username: string
    email?: string
    password: string
  }
}

export const POST = withHandler(async (req) => {
  // SEC-G 安装锁定：已完成初始化的站点，setup 路由硬锁定，禁止任何二次初始化尝试。
  // 放在最前，避免无谓的密码哈希 / 事务开销，并给出明确的 403「已锁定」语义。
  const initFlag = await prisma.siteSetting.findUnique({
    where: { key: "initialized" },
    select: { value: true },
  })
  if (initFlag?.value === "true") {
    throw new ForbiddenError("站点已完成初始化，设置接口已锁定")
  }

  const body: SetupBody = await safeParseJson(req)
  const { siteName, admin } = body

  if (!siteName?.trim()) throw new ValidationError("网站名称不能为空")
  if (!admin?.username?.trim()) throw new ValidationError("管理员用户名不能为空")
  const pwErr = validatePassword(admin.password)
  if (pwErr) throw new ValidationError(pwErr)

  const email = admin.email?.trim() ? admin.email.trim().toLowerCase() : `${admin.username.trim()}@placeholder.local`

  const hashed = await bcrypt.hash(admin.password, 12)

  // Serializable 事务：原子性检查 + 创建，杜绝并发初始化
  const result = await prisma.$transaction(async (tx) => {
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
    // 注意：下方 result.error 分支统一抛 ForbiddenError（见文件末尾），与提前锁定保持一致。

    const newUser = await tx.user.create({
      data: {
        username: admin.username.trim(),
        email,
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
      { key: "logo_mode", value: body.logoMode === "icon" ? "icon" : "full" },
      { key: "default_placeholder_image", value: body.placeholderImage || "" },
      { key: "registration_enabled", value: String(body.registrationEnabled ?? true) },
      { key: "themeColor", value: body.themeColor || "#4C7E96" },
    ]

    for (const s of settings) {
      await tx.siteSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: s,
      })
    }

    // 写入标签组颜色（upsert：如标签组不存在则创建，存在则更新颜色）
    if (body.tagGroupColors) {
      const PRESET_GROUPS: Record<string, string> = {
        preset_home_card: "首页卡片标签",
        preset_detail_header: "详情页信息栏标签",
        preset_discover: "发现页标签",
        preset_resource_tab: "资源标签",
      }
      for (const [id, color] of Object.entries(body.tagGroupColors)) {
        if (!PRESET_GROUPS[id]) continue
        await tx.tagGroup.upsert({
          where: { id },
          update: { color },
          create: { id, name: PRESET_GROUPS[id], color, isPreset: true, positions: "[]" },
        })
      }
    }

    return { user: newUser }
  }, { isolationLevel: "Serializable" })

  if ("error" in result) {
    throw new ForbiddenError("站点已完成初始化，设置接口已锁定")
  }

  revalidateTag("site-settings", { expire: 0 })

  return json({
    userId: result.user.id,
    username: admin.username.trim(),
    email,
  })
})
