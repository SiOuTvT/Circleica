/**
 * Admin Service — 其他（adminStatsService / adminSearchService）
 * 从 src/services/admin.ts 拆分而来，保持导出名与签名完全一致。
 */

import { adminStatsRepo, adminSearchRepo } from "@/repositories/admin"

// ── 统计 ────────────────────────────

export const adminStatsService = {
  getCounts() { return adminStatsRepo.getCounts() },
}

// ── 搜索 ────────────────────────────

export const adminSearchService = {
  search(query: string) {
    if (!query?.trim()) return { games: [], users: [], forumPosts: [] }
    return adminSearchRepo.search(query.trim())
  },
}
