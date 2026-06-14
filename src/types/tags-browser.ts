/**
 * 标签浏览页面类型定义
 */

export interface TagInfo {
  id: string
  name: string
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