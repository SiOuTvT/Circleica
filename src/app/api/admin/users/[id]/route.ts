import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminUserService } from "@/services/admin"
import { createPasswordResetToken } from "@/services/user"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"
import { ValidationError } from "@/lib/errors"

export const GET = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  return json(await adminUserService.getById(id))
})

export const PUT = withHandler(async (req, ctx) => {
  // 角色管理属于超级管理员专属操作：只有 SUPER_ADMIN 可以修改任何用户角色，
  // 避免 ADMIN 自行提升其他用户为 ADMIN（权限提升）。
  const auth = await requireAdminRole("SUPER_ADMIN")
  const { id } = await ctx!.params
  const body = await safeParseJson(req)

  // 两个互不干扰的分支：带 role 改角色，带 newPassword 重置密码
  if (body.role !== undefined) {
    return json(await adminUserService.updateRole(id, body.role, auth.role))
  }
  if (body.newPassword !== undefined) {
    return json(await adminUserService.resetPasswordById(id, String(body.newPassword)))
  }
  throw new ValidationError("没有要修改的内容")
})

/** 生成一次性密码重置链接（不发邮件，链接直接回给管理员去转交） */
export const POST = withHandler(async (_req, ctx) => {
  await requireAdminRole("SUPER_ADMIN")
  const { id } = await ctx!.params

  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "")
  if (!base) throw new ValidationError("未配置站点地址，请先到「站点设置」填写站点 URL 后再生成重置链接")

  const user = await adminUserService.getById(id)
  // 明文 token 只出现在这里的响应里，库里存的是哈希，也不进日志
  const token = await createPasswordResetToken(id)
  const resetUrl = `${base}/reset-password?token=${token}`

  await logAudit({
    userId: "ADMIN",
    action: "user.issueResetLink",
    target: id,
    detail: `《${user.username}》生成一次性重置链接（1 小时有效）`,
  }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))

  return json({ resetUrl })
})

export const DELETE = withHandler(async (_req, ctx) => {
  const auth = await requireAdminRole("SUPER_ADMIN")
  const { id } = await ctx!.params
  await adminUserService.delete(id, auth.role, auth.userId)
  return noContent()
})
