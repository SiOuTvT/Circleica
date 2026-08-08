/**
 * Admin Service — 用户管理（adminUserService / adminCheckinService）
 * 从 src/services/admin.ts 拆分而来，保持导出名与签名完全一致。
 */

import { adminUserRepo, checkInRepo } from "@/repositories/admin"
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors"
import type { UserRole } from "@prisma/client"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"

// ── 用户管理 ────────────────────────

export const adminUserService = {
  getPaginated(page: number, search?: string) { return adminUserRepo.findPaginated(page, 20, search) },

  async getById(id: string) {
    const user = await adminUserRepo.findById(id)
    if (!user) throw new NotFoundError("用户")
    return user
  },

  async updateRole(id: string, role: string, callerRole: UserRole) {
    const validRoles = ["USER", "ADMIN", "SUPER_ADMIN"]
    if (!validRoles.includes(role)) throw new ValidationError("无效的角色")
    const user = await adminUserRepo.findBasic(id)
    if (!user) throw new NotFoundError("用户")
    // 只有 SUPER_ADMIN 可以设置/变更 SUPER_ADMIN 角色
    if (role === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
      throw new ForbiddenError("只有超级管理员可以设置超级管理员角色")
    }
    // 不能降级同级或更高级的用户（除非自己是 SUPER_ADMIN）
    if (callerRole !== "SUPER_ADMIN" && user.role === "SUPER_ADMIN") {
      throw new ForbiddenError("不能修改超级管理员的角色")
    }
    // 防止降级最后一名超级管理员，导致后台无可用超管而锁死（L9）
    if (role !== "SUPER_ADMIN" && user.role === "SUPER_ADMIN") {
      const superAdminCount = await adminUserRepo.countSuperAdmins()
      if (superAdminCount <= 1) throw new ValidationError("至少需保留一名超级管理员")
    }
    const result = await adminUserRepo.updateRole(id, role as UserRole)
    await logAudit({ userId: "ADMIN", action: "user.updateRole", target: id, detail: `role=${role}` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string, callerRole: UserRole, callerId: string) {
    const user = await adminUserRepo.findBasic(id)
    if (!user) throw new NotFoundError("用户")
    if (user.id === callerId) throw new ValidationError("不能删除自己的账号")
    if (user.role === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
      throw new ForbiddenError("只有超级管理员可以删除超级管理员账号")
    }
    // 防止删除最后一名超级管理员，导致后台锁死（L9）
    if (user.role === "SUPER_ADMIN") {
      const superAdminCount = await adminUserRepo.countSuperAdmins()
      if (superAdminCount <= 1) throw new ValidationError("至少需保留一名超级管理员")
    }
    const result = await adminUserRepo.delete(id)
    await logAudit({ userId: "ADMIN", action: "user.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 签到 ────────────────────────────

export const adminCheckinService = {
  getPaginated(page: number) { return checkInRepo.findPaginated(page, 20) },

  async delete(id: string) {
    await checkInRepo.delete(id)
  },
}
