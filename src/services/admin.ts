/**
 * Admin Service — 管理后台业务逻辑（聚合入口）
 *
 * 各域实现已按职责拆分到 src/services/admin/ 子目录：
 *  - games.ts      adminGameService / adminReviewService / linkGameStudios
 *  - users.ts      adminUserService / adminCheckinService
 *  - tags.ts       tagService / tagGroupService / resourceTagService
 *  - content.ts    achievementService / avatarFrameService / creatorService / emotionalMessageService
 *  - community.ts  adminForumService / adminFavoriteService / adminFollowService / reportService / auditLogService
 *  - media.ts      adminMusicService / adminPlaylistService
 *  - misc.ts       adminStatsService / adminSearchService
 *
 * 本文件仅转发导出，保证 @/services/admin 的所有外部引用无需任何改动。
 */

export {
  linkGameStudios,
  adminGameService,
  adminReviewService,
} from "@/services/admin/games"
export {
  adminUserService,
  adminCheckinService,
} from "@/services/admin/users"
export {
  tagService,
  tagGroupService,
  resourceTagService,
} from "@/services/admin/tags"
export {
  achievementService,
  avatarFrameService,
  creatorService,
  emotionalMessageService,
} from "@/services/admin/content"
export {
  adminForumService,
  adminFavoriteService,
  adminFollowService,
  reportService,
  auditLogService,
} from "@/services/admin/community"
export {
  adminMusicService,
  adminPlaylistService,
} from "@/services/admin/media"
export {
  adminStatsService,
  adminSearchService,
} from "@/services/admin/misc"
