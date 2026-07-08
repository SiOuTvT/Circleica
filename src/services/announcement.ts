/**
 * 公告 Service — 业务逻辑层
 *
 * 职责：
 * - 输入校验 + 清理
 * - 业务规则
 * - 调用 Repository
 */

import { announcementRepo, type AnnouncementCreateInput } from "@/repositories/announcement"
import { announcementSchema } from "@/lib/validations"
import { NotFoundError } from "@/lib/errors"
import type { AuthContext } from "@/lib/auth-context"

interface AnnouncementRawInput {
  title?: unknown
  content?: unknown
  imageUrl?: unknown
  link?: unknown
  startAt?: unknown
  endAt?: unknown
  isActive?: unknown
}

export const announcementService = {
  /** 公开：获取最新公告 */
  getLatest(limit?: number) {
    return announcementRepo.findLatest(limit)
  },

  /** 管理员：获取全部公告 */
  getAll() {
    return announcementRepo.findAll()
  },

  /** 管理员：创建公告 */
  async create(raw: AnnouncementRawInput, ctx: AuthContext) {
    // Zod 验证标题和内容
    const validated = announcementSchema.parse({
      title: raw.title,
      content: raw.content,
    })

    const createData: AnnouncementCreateInput = {
      title: validated.title.trim(),
      content: validated.content.trim(),
      imageUrl: raw.imageUrl ? String(raw.imageUrl).trim() : "",
      link: raw.link ? String(raw.link).trim() : "",
      authorName: ctx.username,
      authorAvatar: "",
      startAt: raw.startAt ? new Date(String(raw.startAt)) : null,
      endAt: raw.endAt ? new Date(String(raw.endAt)) : null,
    }

    // 获取发布者头像
    const { prisma } = await import("@/lib/prisma")
    const adminUser = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { avatar: true },
    })
    createData.authorAvatar = adminUser?.avatar ?? ""

    return announcementRepo.create(createData)
  },

  /** 管理员：更新公告 */
  async update(id: string, raw: AnnouncementRawInput) {
    const existing = await announcementRepo.findById(id)
    if (!existing) throw new NotFoundError("公告")

    const data: Record<string, unknown> = {}
    if (raw.title !== undefined) data.title = String(raw.title).trim()
    if (raw.content !== undefined) data.content = String(raw.content).trim()
    if (raw.imageUrl !== undefined) data.imageUrl = String(raw.imageUrl).trim()
    if (raw.link !== undefined) data.link = String(raw.link).trim()
    if (raw.isActive !== undefined) data.isActive = Boolean(raw.isActive)
    if (raw.startAt !== undefined) data.startAt = raw.startAt ? new Date(String(raw.startAt)) : null
    if (raw.endAt !== undefined) data.endAt = raw.endAt ? new Date(String(raw.endAt)) : null

    return announcementRepo.update(id, data)
  },

  /** 管理员：删除公告 */
  async delete(id: string) {
    const existing = await announcementRepo.findById(id)
    if (!existing) throw new NotFoundError("公告")
    return announcementRepo.delete(id)
  },

  /** 管理员：重排序 */
  reorder(items: { id: string; sortOrder: number }[]) {
    return announcementRepo.reorder(items)
  },
}
