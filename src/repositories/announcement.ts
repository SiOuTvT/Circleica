/**
 * 公告 Repository — 纯数据访问，无业务逻辑
 */

import { prisma } from "@/lib/prisma"

export interface AnnouncementCreateInput {
  title: string
  content: string
  imageUrl?: string
  link?: string
  authorName?: string
  authorAvatar?: string
  startAt?: Date | null
  endAt?: Date | null
}

export interface AnnouncementUpdateInput {
  title?: string
  content?: string
  imageUrl?: string
  link?: string
  isActive?: boolean
  startAt?: Date | null
  endAt?: Date | null
}

const publicSelect = {
  id: true,
  title: true,
  content: true,
  imageUrl: true,
  link: true,
  createdAt: true,
  authorName: true,
  authorAvatar: true,
} as const

const adminSelect = {
  ...publicSelect,
  sortOrder: true,
  isActive: true,
  startAt: true,
  endAt: true,
  updatedAt: true,
} as const

export const announcementRepo = {
  /** 最新 N 条公告（公开） */
  findLatest(limit = 1) {
    return prisma.announcement.findMany({
      orderBy: { sortOrder: "asc" },
      take: limit,
      select: publicSelect,
    })
  },

  /** 全部公告（管理员） */
  findAll() {
    return prisma.announcement.findMany({
      orderBy: { sortOrder: "asc" },
      select: adminSelect,
    })
  },

  /** ID 查询 */
  findById(id: string) {
    return prisma.announcement.findUnique({
      where: { id },
      select: adminSelect,
    })
  },

  /** 创建 */
  create(data: AnnouncementCreateInput) {
    return prisma.announcement.create({
      data,
      select: adminSelect,
    })
  },

  /** 更新 */
  update(id: string, data: AnnouncementUpdateInput) {
    return prisma.announcement.update({
      where: { id },
      data,
      select: adminSelect,
    })
  },

  /** 删除 */
  delete(id: string) {
    return prisma.announcement.delete({ where: { id } })
  },

  /** 批量排序 */
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
