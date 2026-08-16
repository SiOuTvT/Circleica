/**
 * Admin Service — 媒体管理（adminMusicService / adminPlaylistService）
 * 从 src/services/admin.ts 拆分而来，保持导出名与签名完全一致。
 */

import { musicRepo, playlistRepo } from "@/repositories/admin"
import { NotFoundError, ValidationError } from "@/lib/errors"
import type { Prisma } from "@/generated/prisma/client"
import { logAudit } from "@/lib/audit-log"
import { deleteByUrl } from "@/lib/storage"
import { logger } from "@/lib/logger"

// ── 音乐 ────────────────────────────

export const adminMusicService = {
  getAll() { return musicRepo.findAll() },

  async create(raw: { title?: string; url?: string; playlistId?: string }) {
    if (!raw.title?.trim()) throw new ValidationError("标题不能为空")
    if (!raw.url?.trim()) throw new ValidationError("链接不能为空")
    let playlistId: string | null = raw.playlistId || null
    if (playlistId) {
      const pl = await playlistRepo.findById(playlistId)
      if (!pl) playlistId = null
    }
    const result = await musicRepo.create({
      title: raw.title.trim(),
      filename: raw.url.trim(),
      url: raw.url.trim(),
      playlist: playlistId ? { connect: { id: playlistId } } : undefined,
    })
    await logAudit({ userId: "ADMIN", action: "music.create", target: result.id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, raw: Record<string, unknown>) {
    const data: Prisma.MusicUpdateInput = {}
    if ("isActive" in raw) data.isActive = raw.isActive as boolean
    if (typeof raw.title === "string" && raw.title.trim()) data.title = raw.title.trim()
    if (typeof raw.url === "string" && raw.url.trim()) { data.url = raw.url.trim(); data.filename = raw.url.trim() }
    if (Object.keys(data).length === 0) throw new ValidationError("没有要更新的字段")
    const result = await musicRepo.update(id, data)
    await logAudit({ userId: "ADMIN", action: "music.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    const music = await musicRepo.findById(id)
    if (!music) throw new NotFoundError("音乐")
    const result = await musicRepo.delete(id)
    // 清理本站上传的音频文件（外部直链不会命中 /uploads/ 或 R2 前缀，不会误删）
    if (music.filename || music.url) {
      await deleteByUrl(music.filename || music.url).catch((e) => logger.system.error("[Media] 删除音频文件失败", e))
    }
    await logAudit({ userId: "ADMIN", action: "music.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 播放列表 ────────────────────────

export const adminPlaylistService = {
  getAll() { return playlistRepo.findAll() },

  async getById(id: string) {
    const pl = await playlistRepo.findById(id)
    if (!pl) throw new NotFoundError("播放列表")
    return pl
  },

  async create(name: string) {
    if (!name?.trim()) throw new ValidationError("名称不能为空")
    const result = await playlistRepo.create({ name: name.trim() })
    await logAudit({ userId: "ADMIN", action: "playlist.create", target: result.id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, name: string) {
    if (!name?.trim()) throw new ValidationError("名称不能为空")
    await playlistRepo.findById(id).then(pl => { if (!pl) throw new NotFoundError("播放列表") })
    const result = await playlistRepo.update(id, { name: name.trim() })
    await logAudit({ userId: "ADMIN", action: "playlist.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    await playlistRepo.findById(id).then(pl => { if (!pl) throw new NotFoundError("播放列表") })
    const result = await playlistRepo.delete(id)
    await logAudit({ userId: "ADMIN", action: "playlist.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}
