/**
 * 公告 Service — 业务逻辑层
 *
 * 职责：
 * - 输入校验 + 清理
 * - 业务规则
 * - 调用 Repository
 */

import { announcementRepo, type AnnouncementCreateInput } from "@/repositories/announcement"
import { announcementCreateSchema, announcementUpdateSchema } from "@/lib/validations"
import { NotFoundError, ValidationError } from "@/lib/errors"
import type { AuthContext } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"

const VALID_STATUSES = ["draft", "published", "hidden"]

export const announcementService = {
  /** 公开：获取已发布的公告 */
  getPublished(limit?: number) {
    return announcementRepo.findPublished(limit)
  },

  /** 管理员：获取全部公告 */
  getAll() {
    return announcementRepo.findAll()
  },

  /** 管理员：创建公告 */
  async create(raw: Record<string, unknown>, ctx: AuthContext) {
    const validated = announcementCreateSchema.parse({
      title: raw.title,
      summary: raw.summary,
      content: raw.content,
      imageUrl: raw.imageUrl,
      link: raw.link,
      status: raw.status,
      isPinned: raw.isPinned,
      startAt: raw.startAt,
      endAt: raw.endAt,
    })

    if (validated.status && !VALID_STATUSES.includes(validated.status)) {
      throw new ValidationError(`无效的状态值: ${validated.status}`)
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { avatar: true },
    })

    const createData: AnnouncementCreateInput = {
      title: validated.title.trim(),
      summary: (validated.summary ?? "").trim(),
      content: validated.content.trim(),
      imageUrl: validated.imageUrl?.trim() ?? "",
      link: validated.link?.trim() ?? "",
      authorName: ctx.username,
      authorAvatar: adminUser?.avatar ?? "",
      status: validated.status ?? "draft",
      isPinned: validated.isPinned ?? false,
      startAt: validated.startAt ? new Date(validated.startAt) : null,
      endAt: validated.endAt ? new Date(validated.endAt) : null,
    }

    return announcementRepo.create(createData)
  },

  /** 管理员：更新公告 */
  async update(id: string, raw: Record<string, unknown>) {
    const existing = await announcementRepo.findById(id)
    if (!existing) throw new NotFoundError("公告")

    const parsed = announcementUpdateSchema.parse(raw)

    if (parsed.status && !VALID_STATUSES.includes(parsed.status)) {
      throw new ValidationError(`无效的状态值: ${parsed.status}`)
    }

    const data: Record<string, unknown> = {}
    if (parsed.title !== undefined) data.title = String(parsed.title).trim()
    if (parsed.summary !== undefined) data.summary = String(parsed.summary).trim()
    if (parsed.content !== undefined) data.content = String(parsed.content).trim()
    if (parsed.imageUrl !== undefined) data.imageUrl = String(parsed.imageUrl).trim()
    if (parsed.link !== undefined) data.link = String(parsed.link).trim()
    if (parsed.status !== undefined) data.status = parsed.status
    if (parsed.isPinned !== undefined) data.isPinned = parsed.isPinned
    if (parsed.isActive !== undefined) data.isActive = parsed.isActive
    if (parsed.startAt !== undefined) data.startAt = parsed.startAt ? new Date(parsed.startAt) : null
    if (parsed.endAt !== undefined) data.endAt = parsed.endAt ? new Date(parsed.endAt) : null
    if (parsed.sortOrder !== undefined) data.sortOrder = parsed.sortOrder

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
