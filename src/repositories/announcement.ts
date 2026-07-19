/**
 * 公告 Repository — 纯数据访问，无业务逻辑
 */

import { prisma } from "@/lib/prisma"

export interface AnnouncementCreateInput {
  title: string
  summary?: string
  content: string
  imageUrl?: string
  link?: string
  authorName?: string
  authorAvatar?: string
  status?: string
  isPinned?: boolean
  isActive?: boolean
  startAt?: Date | null
  endAt?: Date | null
  sortOrder?: number
}

export interface AnnouncementUpdateInput {
  title?: string
  summary?: string
  content?: string
  imageUrl?: string
  link?: string
  authorName?: string
  authorAvatar?: string
  status?: string
  isPinned?: boolean
  isActive?: boolean
  startAt?: Date | null
  endAt?: Date | null
  sortOrder?: number
}

const publicSelect = {
  id: true,
  title: true,
  summary: true,
  content: true,
  imageUrl: true,
  link: true,
  createdAt: true,
  authorName: true,
  authorAvatar: true,
  isPinned: true,
} as const

const adminSelect = {
  ...publicSelect,
  status: true,
  isActive: true,
  startAt: true,
  endAt: true,
  sortOrder: true,
  updatedAt: true,
} as const

export const announcementRepo = {
  /** 公开公告：仅 published + 在时间范围内，置顶优先 */
  async findPublished(limit = 10) {
    const now = new Date()
    return prisma.announcement.findMany({
      where: {
        status: "published",
        isActive: true,
        OR: [
          { startAt: null },
          { startAt: { lte: now } },
        ],
        AND: [
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }],
      take: limit,
      select: publicSelect,
    })
  },

  /** 全部公告（管理员） */
  findAll() {
    return prisma.announcement.findMany({
      orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }],
      select: adminSelect,
    })
  },

  findById(id: string) {
    return prisma.announcement.findUnique({
      where: { id },
      select: adminSelect,
    })
  },

  create(data: AnnouncementCreateInput) {
    return prisma.announcement.create({
      data: {
        title: data.title,
        summary: data.summary ?? "",
        content: data.content,
        imageUrl: data.imageUrl ?? "",
        link: data.link ?? "",
        authorName: data.authorName ?? "",
        authorAvatar: data.authorAvatar ?? "",
        status: data.status ?? "draft",
        isPinned: data.isPinned ?? false,
        isActive: data.isActive ?? true,
        startAt: data.startAt,
        endAt: data.endAt,
        sortOrder: data.sortOrder ?? 0,
      },
      select: adminSelect,
    })
  },

  update(id: string, data: AnnouncementUpdateInput) {
    return prisma.announcement.update({
      where: { id },
      data,
      select: adminSelect,
    })
  },

  delete(id: string) {
    return prisma.announcement.delete({ where: { id } })
  },

  reorder(items: { id: string; sortOrder: number }[]) {
    return prisma.$transaction(
      items.map(item =>
        prisma.announcement.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    )
  },
}
