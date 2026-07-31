/**
 * 标签浏览页面类型定义
 */

export interface TagInfo {
  id: string
  name: string
  slug: string | null
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

export interface TagGroupWithTags {
  id: string
  name: string
  color: string
  description: string | null
  tags: TagInfo[]
}

export interface TagBrowserData {
  /** 热门标签（按游戏数量降序） */
  hotTags: TagInfo[]
  /** 标签组及其标签（按组顺序） */
  tagGroups: TagGroupWithTags[]
  /** 统计信息 */
  stats: {
    totalTags: number
    totalGames: number
  }
  /** 按首字母聚合的标签（用于索引） */
  tagsByLetter: Record<string, TagWithGroup[]>
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
}