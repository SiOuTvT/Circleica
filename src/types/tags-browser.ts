/**
 * 标签浏览页面类型定义
 */

export interface TagInfo {
  id: string
  name: string
  slug: string
  color: string
  gameCount: number
}

export interface TagWithGroup extends TagInfo {
  group: {
    id: string
    name: string
    color: string
  }
}

export interface TagBrowserData {
  /** 全部主站标签（仅保留已关联已发布游戏的），按关联作品数倒序 */
  tags: TagWithGroup[]
}

/** 标签详情页单条游戏（供 GameCard 映射） */
export interface TagGameItem {
  id: string
  serialId: number | null
  title: string
  coverImage: string | null
  isNsfw: boolean
  status: string
  favoriteCount: number
  viewCount: number | null
  downloadCount: number | null
}

/** 标签详情数据 */
export interface TagDetail {
  id: string
  name: string
  slug: string | null
  description: string | null
  color: string | null
  group: { id: string; name: string; color: string } | null
  games: TagGameItem[]
  /** 该标签下已发布游戏总数（真实计数，不受截断影响） */
  gameCount: number
  /** 超过安全阈值被截断展示 */
  hasMore: boolean
  /** 相关标签（同组 + 高频共现），用于高级版聚合推荐 */
  relatedTags?: TagInfo[]
}
