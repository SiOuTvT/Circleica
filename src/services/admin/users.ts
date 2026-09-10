/**
 * Admin Service — 用户管理（adminUserService / adminCheckinService）
 * 从 src/services/admin.ts 拆分而来，保持导出名与签名完全一致。
 */

import { adminUserRepo, checkInRepo } from "@/repositories/admin"
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors"
import type { UserRole } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"
import { cache, cacheKey } from "@/lib/redis"
import { validatePassword } from "@/lib/password"
import { toShanghaiDate } from "@/lib/date"
import bcrypt from "bcryptjs"

/**
 * 后台用户列表缓存前缀。必须与 /admin/users 页面读的那个 key 同命名空间：
 * 页面用 cacheKey("admin:users", page, q, limit)，这里只传命名空间即其前缀。
 */
const ADMIN_USERS_CACHE_PREFIX = cacheKey("admin:users")

/** 用户列表缓存失效（改角色/删号/重置密码后调用）；清理失败不影响主流程 */
async function invalidateAdminUsersCache(): Promise<void> {
  await cache.delByPrefix(ADMIN_USERS_CACHE_PREFIX).catch(() => {})
}

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
    // 防止降级最后一名超级管理员，导致后台无可用超管而锁死（L9）。
    // 用交互式事务把「重新计数超管 + 降级」放同一事务：事务内串行化，
    // 消除两个请求并发时 count-then-act 都通过检查、最终把超管清零的竞态。
    if (role !== "SUPER_ADMIN" && user.role === "SUPER_ADMIN") {
      const result = await prisma.$transaction(async (tx) => {
        const superAdminCount = await tx.user.count({ where: { role: "SUPER_ADMIN" } })
        if (superAdminCount <= 1) throw new ValidationError("至少需保留一名超级管理员")
        return tx.user.update({ where: { id }, data: { role: role as UserRole } })
      })
      await invalidateAdminUsersCache()
      await logAudit({ userId: "ADMIN", action: "user.updateRole", target: id, detail: `《${user.username}》${user.role === role ? "无字段变化" : `role=${role}`}` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
      return result
    }
    const result = await adminUserRepo.updateRole(id, role as UserRole)
    await invalidateAdminUsersCache()
    await logAudit({ userId: "ADMIN", action: "user.updateRole", target: id, detail: `《${user.username}》${user.role === role ? "无字段变化" : `role=${role}`}` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string, callerRole: UserRole, callerId: string) {
    const user = await adminUserRepo.findBasic(id)
    if (!user) throw new NotFoundError("用户")
    if (user.id === callerId) throw new ValidationError("不能删除自己的账号")
    if (user.role === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
      throw new ForbiddenError("只有超级管理员可以删除超级管理员账号")
    }
    // 防止删除最后一名超级管理员，导致后台锁死（L9）。交互式事务内计数+删除，防并发竞态。
    if (user.role === "SUPER_ADMIN") {
      const result = await prisma.$transaction(async (tx) => {
        const superAdminCount = await tx.user.count({ where: { role: "SUPER_ADMIN" } })
        if (superAdminCount <= 1) throw new ValidationError("至少需保留一名超级管理员")
        await tx.game.updateMany({ where: { reviewedBy: id }, data: { reviewedBy: null } })
        return tx.user.delete({ where: { id } })
      })
      await logAudit({ userId: "ADMIN", action: "user.delete", target: id, detail: `《${user.username}》` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
      return result
    }
    const result = await adminUserRepo.delete(id)
    await invalidateAdminUsersCache()
    await logAudit({ userId: "ADMIN", action: "user.delete", target: id, detail: `《${user.username}》` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async resetPasswordById(id: string, newPassword: string) {
    const user = await adminUserRepo.findBasic(id)
    if (!user) throw new NotFoundError("用户")
    // 复用全站统一的密码强度策略（与注册 / 找回密码同一条规则），不另立标准
    const pwErr = validatePassword(newPassword)
    if (pwErr) throw new ValidationError(pwErr)

    const hashed = await bcrypt.hash(newPassword, 12)
    // select 必须写：不写的话返回值会带 password 哈希并被路由 json() 吐出去
    const result = await prisma.user.update({
      where: { id },
      data: { password: hashed },
      select: { id: true, username: true, role: true },
    })
    await invalidateAdminUsersCache()
    // 注意：新密码只用于哈希，不进日志、不进 detail、不进返回值
    await logAudit({
      userId: "ADMIN",
      action: "user.resetPassword",
      target: id,
      detail: `《${user.username}》由管理员重置密码`,
    }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 签到 ────────────────────────────

export const adminCheckinService = {
  getPaginated(page: number) { return checkInRepo.findPaginated(page, 20) },

  async delete(id: string) {
    // 删除签到必须同步回退该次签到获得的印记，否则 marksSpent 不变而 checkIn._sum.marks 减少，
    // 用户可用印记（= _sum.marks - marksSpent）会凭空缩水甚至变负，破坏余额一致性。
    const checkin = await prisma.checkIn.findUnique({
      where: { id },
      select: { userId: true, marks: true, date: true },
    })
    if (!checkin) throw new NotFoundError("签到记录")

    // 交互式事务内读后写：回退量取 min(本次签到印记, 当前 marksSpent)，
    // 保证 marksSpent 不会减成负数（负的 marksSpent 会让消费校验更容易通过，等于凭空发印记）。
    const { dec, username } = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: checkin.userId },
        select: { marksSpent: true, username: true },
      })
      const dec = Math.max(0, Math.min(checkin.marks, target?.marksSpent ?? 0))
      await tx.checkIn.delete({ where: { id } })
      if (dec > 0) {
        await tx.user.update({
          where: { id: checkin.userId },
          data: { marksSpent: { decrement: dec } },
        })
      }
      return { dec, username: target?.username ?? "" }
    })

    const dateText = toShanghaiDate(checkin.date)
    await logAudit({
      userId: "ADMIN",
      action: "checkin.delete",
      target: id,
      detail: dec > 0
        ? `《${username}》删除 ${dateText} 的签到（回退印记 ${dec}）`
        : `《${username}》删除 ${dateText} 的签到（印记已消费为 0，无需回退）`,
    }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
  },
}
