/**
 * 用户 Service — 用户/认证/通知/关注/搜索等公共业务逻辑
 */

import { userRepo, collectionRepo, notificationRepo, followRepo, commentRepo, searchRepo, checkinRepo, profileRepo } from "@/repositories/user"
import { NotFoundError, ValidationError, ConflictError, UnauthorizedError } from "@/lib/errors"
import { sendPasswordResetEmail, sendVerificationEmail, sendEmailChangeEmail, sendWelcomeEmail } from "@/lib/email"
import { getEmailConfigured } from "@/lib/service-config"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

// ── Token 工具 ──────────────────────

function generateToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex")
  const hash = crypto.createHash("sha256").update(raw).digest("hex")
  return { raw, hash }
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

// ── 认证 ────────────────────────────

export const authService = {
  async register(raw: Record<string, unknown>) {
    const username = String(raw.username || "").trim()
    const email = String(raw.email || "").trim().toLowerCase()
    const password = String(raw.password || "")

    if (!username || username.length < 3 || username.length > 20) throw new ValidationError("用户名 3-20 个字符")
    if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new ValidationError("用户名只能包含字母、数字和下划线")
    if (!email || !email.includes("@")) throw new ValidationError("邮箱格式不正确")
    if (!password || password.length < 8) throw new ValidationError("密码至少 8 位")

    const existingUser = await userRepo.findByUsername(username)
    if (existingUser) throw new ConflictError("用户名已被注册")
    const existingEmail = await userRepo.findByEmail(email)
    if (existingEmail) throw new ConflictError("邮箱已被注册")

    const hashed = await bcrypt.hash(password, 12)
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      const regSetting = await prisma.siteSetting.findUnique({
        where: { key: "registration_enabled" },
        select: { value: true },
      })
      if (regSetting?.value === "false") {
        throw new UnauthorizedError("注册已关闭，请联系管理员")
      }
    }

    const isFirstUser = userCount === 0

    // 读取邮件验证配置（在创建用户前，避免创建后无法发送邮件）
    const [verifySetting, welcomeSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "email_verification_enabled" }, select: { value: true } }),
      prisma.siteSetting.findUnique({ where: { key: "send_welcome_email" }, select: { value: true } }),
    ])
    const needVerify = verifySetting?.value === "true" && !isFirstUser
    const needWelcome = welcomeSetting?.value === "true"

    // 如果需要发送邮件，检查邮件服务是否配置
    if ((needVerify || needWelcome) && !getEmailConfigured()) {
      if (needVerify) {
        throw new ValidationError("邮件服务未配置，无法发送验证邮件。请联系管理员在后台配置邮件服务。")
      }
      // 仅欢迎邮件未配置时不阻断注册，仅跳过
    }

    const role = isFirstUser ? "SUPER_ADMIN" : "USER"
    const emailVerified = isFirstUser ? true : false
    const user = await userRepo.create({ username, email, password: hashed, role, emailVerified })

    if (needVerify) {
      await this.sendVerificationEmail(user.id, email).catch(e =>
        logger.system.error("[Register] 验证邮件发送失败", e)
      )
    }

    if (needWelcome) {
      await sendWelcomeEmail(email, username).catch(e =>
        logger.system.error("[Register] 欢迎邮件发送失败", e)
      )
    }

    return { ...user, emailVerificationSent: needVerify }
  },

  // ── 邮箱验证 ──────────────────────

  async sendVerificationEmail(userId: string, email?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, username: true } })
    if (!user) throw new NotFoundError("用户")
    if (user.email !== (email || user.email)) throw new ValidationError("邮箱不匹配")

    // 冷却检查：同一用户 5 分钟内不可重复发送
    const recent = await prisma.emailVerificationToken.findFirst({
      where: { userId, type: "verify", usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })
    if (recent) {
      const elapsed = Date.now() - recent.createdAt.getTime()
      if (elapsed < 5 * 60 * 1000) {
        throw new ValidationError("请等待 5 分钟后再发送验证邮件")
      }
    }

    // 清除旧的未使用 token
    await prisma.emailVerificationToken.deleteMany({
      where: { userId, type: "verify", usedAt: null },
    })

    const { raw, hash } = generateToken()
    await prisma.emailVerificationToken.create({
      data: { userId, email: email || user.email, tokenHash: hash, type: "verify", expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
    })

    await sendVerificationEmail(email || user.email, raw, user.username)
    return { success: true }
  },

  async verifyEmail(rawToken: string) {
    if (!rawToken) throw new ValidationError("验证令牌不能为空")
    const tokenHash = hashToken(rawToken)

    const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } })
    if (!record) throw new ValidationError("验证链接无效")
    if (record.usedAt) throw new ValidationError("验证链接已使用")
    if (record.expiresAt < new Date()) throw new ValidationError("验证链接已过期，请重新发送")

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date(), email: record.email },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    return { success: true, email: record.email }
  },

  // ── 修改邮箱 ──────────────────────

  async requestEmailChange(userId: string, newEmail: string, currentPassword: string) {
    if (!newEmail || !newEmail.includes("@")) throw new ValidationError("邮箱格式不正确")
    if (!currentPassword) throw new ValidationError("请输入当前密码")

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, password: true } })
    if (!user) throw new NotFoundError("用户")

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) throw new UnauthorizedError("当前密码不正确")

    const normalizedEmail = newEmail.trim().toLowerCase()
    if (normalizedEmail === user.email) throw new ValidationError("新邮箱与当前邮箱相同")

    const existing = await userRepo.findByEmail(normalizedEmail)
    if (existing) throw new ConflictError("该邮箱已被使用")

    // 冷却检查
    const recent = await prisma.emailVerificationToken.findFirst({
      where: { userId, type: "change_email", usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })
    if (recent) {
      const elapsed = Date.now() - recent.createdAt.getTime()
      if (elapsed < 5 * 60 * 1000) {
        throw new ValidationError("请等待 5 分钟后再发送验证邮件")
      }
    }

    // 清除旧的未使用 token
    await prisma.emailVerificationToken.deleteMany({
      where: { userId, type: "change_email", usedAt: null },
    })

    const { raw, hash } = generateToken()
    await prisma.emailVerificationToken.create({
      data: { userId, email: normalizedEmail, tokenHash: hash, type: "change_email", expiresAt: new Date(Date.now() + 3600 * 1000) },
    })

    await sendEmailChangeEmail(normalizedEmail, raw).catch(e =>
      logger.system.error("[ChangeEmail] 变更邮件发送失败", e)
    )
    return { success: true }
  },

  async confirmEmailChange(rawToken: string) {
    if (!rawToken) throw new ValidationError("验证令牌不能为空")
    const tokenHash = hashToken(rawToken)

    const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } })
    if (!record) throw new ValidationError("验证链接无效")
    if (record.type !== "change_email") throw new ValidationError("令牌类型不正确")
    if (record.usedAt) throw new ValidationError("验证链接已使用")
    if (record.expiresAt < new Date()) throw new ValidationError("验证链接已过期")

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { email: record.email, emailVerified: true, emailVerifiedAt: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    return { success: true, email: record.email }
  },

  async forgotPassword(email: string) {
    if (!email) throw new ValidationError("邮箱不能为空")
    const user = await userRepo.findByEmail(email.toLowerCase().trim())
    if (!user) return { success: true }
    const { raw, hash } = generateToken()
    const expiresAt = new Date(Date.now() + 3600000)
    await prisma.passwordResetToken.create({ data: { userId: user.id, token: hash, expiresAt } })
    await sendPasswordResetEmail(email.toLowerCase().trim(), raw).catch(e =>
      logger.system.error("[ForgotPassword] 重置邮件发送失败", e)
    )
    return { success: true }
  },

  async resetPassword(token: string, password: string) {
    if (!token) throw new ValidationError("重置令牌不能为空")
    if (!password || password.length < 8) throw new ValidationError("密码至少 8 位")
    const hash = hashToken(token)
    const record = await prisma.passwordResetToken.findUnique({ where: { token: hash } })
    if (!record || record.usedAt || record.expiresAt < new Date()) throw new ValidationError("令牌无效或已过期")
    const hashed = await bcrypt.hash(password, 12)
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ])
    return { success: true }
  },
}

// ── 用户资料 ────────────────────────

export const userService = {
  async getProfile(userId: string) {
    const user = await userRepo.findById(userId)
    if (!user) throw new NotFoundError("用户")
    return user
  },

  async updateProfile(userId: string, raw: Record<string, unknown>) {
    const data: Record<string, unknown> = {}
    if (raw.username !== undefined) {
      const username = String(raw.username).trim()
      if (username.length < 3 || username.length > 20) throw new ValidationError("用户名 3-20 个字符")
      if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new ValidationError("用户名只能包含字母、数字和下划线")
      const existing = await userRepo.findByUsername(username)
      if (existing && existing.id !== userId) throw new ConflictError("用户名已被占用")
      data.username = username
    }
    if (raw.bio !== undefined) data.bio = String(raw.bio).slice(0, 500)
    if (raw.avatar !== undefined) data.avatar = String(raw.avatar)
    if (raw.banner !== undefined) data.banner = String(raw.banner)
    if (raw.faveGameId !== undefined) data.faveGameId = raw.faveGameId || null
    return userRepo.updateProfile(userId, data)
  },

  async setAvatarFrame(userId: string, frameId: string | null) {
    if (frameId && frameId !== "none") {
      const frame = await prisma.avatarFrame.findUnique({ where: { id: frameId } })
      if (!frame) throw new NotFoundError("头像框")
    }
    return userRepo.updateAvatarFrame(userId, frameId === "none" ? null : frameId)
  },

  getStats(userId: string) { return userRepo.getStats(userId) },
}

// ── 收藏夹 ──────────────────────────

export const collectionService = {
  getByUserId(userId: string) { return collectionRepo.findByUserId(userId) },

  async getById(id: string) {
    const c = await collectionRepo.findById(id)
    if (!c) throw new NotFoundError("收藏夹")
    return c
  },

  async create(userId: string, raw: Record<string, unknown>) {
    if (!raw.name?.toString().trim()) throw new ValidationError("名称不能为空")
    return collectionRepo.create(userId, {
      name: String(raw.name).trim(),
      description: raw.description ? String(raw.description) : "",
    })
  },

  async update(userId: string, id: string, raw: Record<string, unknown>) {
    const c = await collectionRepo.findById(id)
    if (!c) throw new NotFoundError("收藏夹")
    if (c.userId !== userId) throw new NotFoundError("收藏夹")
    const data: Record<string, unknown> = {}
    if (raw.name) data.name = String(raw.name).trim()
    if (raw.description !== undefined) data.description = String(raw.description)
    return collectionRepo.update(id, data)
  },

  async delete(userId: string, id: string) {
    const c = await collectionRepo.findById(id)
    if (!c) throw new NotFoundError("收藏夹")
    if (c.userId !== userId) throw new NotFoundError("收藏夹")
    return collectionRepo.delete(id)
  },
}

// ── 通知 ────────────────────────────

export const notificationService = {
  getPaginated(userId: string, page: number, unreadOnly?: boolean) {
    return notificationRepo.findPaginated(userId, page, 20, unreadOnly)
  },

  getUnreadCount(userId: string) { return notificationRepo.getUnreadCount(userId) },

  markAllRead(userId: string) { return notificationRepo.markAllRead(userId) },

  markRead(id: string) { return notificationRepo.markRead(id) },
}

// ── 关注 ────────────────────────────

export const followService = {
  async toggle(followerId: string, followingId: string) {
    if (followerId === followingId) throw new ValidationError("不能关注自己")
    const target = await userRepo.findById(followingId)
    if (!target) throw new NotFoundError("用户")
    const existing = await followRepo.isFollowing(followerId, followingId)
    if (existing) {
      await followRepo.unfollow(followerId, followingId)
      return { following: false }
    } else {
      await followRepo.follow(followerId, followingId)
      // 通知
      notificationRepo.create({
        userId: followingId,
        actorId: followerId,
        type: "follow",
        targetType: "user",
        targetId: followerId,
      }).catch(() => {})
      return { following: true }
    }
  },
}

// ── 评论（公共）────────────────────

export const commentService = {
  async delete(userId: string, commentId: string, isAdmin = false) {
    const comment = await commentRepo.findById(commentId)
    if (!comment) throw new NotFoundError("评论")
    if (!isAdmin && comment.userId !== userId) throw new NotFoundError("评论")
    return commentRepo.delete(commentId)
  },

  async toggleLike(userId: string, commentId: string) {
    const comment = await commentRepo.findById(commentId)
    if (!comment) throw new NotFoundError("评论")
    return commentRepo.toggleLike(userId, commentId)
  },
}

// ── 搜索 ────────────────────────────

export const searchService = {
  search(q: string, page: number, limit: number): Promise<[any[], number]> {
    if (!q?.trim()) return Promise.resolve([[], 0] as [any[], number])
    return searchRepo.search(q.trim(), page, Math.min(limit, 50))
  },

  suggestions(q: string) {
    if (!q?.trim() || q.trim().length < 2) return Promise.resolve([])
    return searchRepo.suggestions(q.trim())
  },
}

// ── 签到 ────────────────────────────

export const checkinService = {
  async checkIn(userId: string) {
    const today = new Date()
    const existing = await checkinRepo.findByDate(userId, today)
    if (existing) throw new ConflictError("今天已经签到过了")
    const marks = Math.floor(Math.random() * 10) + 1
    await checkinRepo.create(userId, marks)
    // 连续签到天数
    const records = await checkinRepo.getUserStreak(userId)
    let streak = 0
    const now = new Date()
    for (let i = 0; i < records.length; i++) {
      const expected = new Date(now)
      expected.setDate(expected.getDate() - i)
      const expectedStr = expected.toISOString().split("T")[0]
      const recordStr = new Date(records[i].date).toISOString().split("T")[0]
      if (expectedStr === recordStr) streak++
      else break
    }
    return { marks, streak }
  },

  async getStatus(userId: string) {
    const today = new Date()
    const existing = await checkinRepo.findByDate(userId, today)
    return { checkedIn: !!existing }
  },
}

// ── 个人资料页 ─────────────────────

export const profileDataService = {
  getComments(userId: string, page: number) { return profileRepo.findComments(userId, page, 20) },
  getFavorites(userId: string) { return profileRepo.findFavorites(userId) },
  getPlayStatuses(userId: string) { return profileRepo.findPlayStatuses(userId) },
}
