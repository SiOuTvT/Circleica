/** 游戏详情页相关共享类型 */

export interface Creator {
  id: string
  name: string
  nameJa: string | null
  avatar: string | null
  role: string
}

export interface DownloadLink {
  label: string
  url: string
}

export interface GameComment {
  id: string
  content: string
  imageUrl?: string
  likeCount: number
  createdAt: string
  user: { id: string; username: string; avatar: string | null }
}

export interface TagInfo {
  name: string
  color: string
}

export interface FileSizeEntry {
  value: string
  unit: string
}

/** 制作人员角色中文映射 */
export const CREATOR_ROLE_LABELS: Record<string, string> = {
  scenario: '脚本',
  art: '原画',
  chardesign: '角色设计',
  director: '导演',
  music: '音乐',
  songs: '主题曲',
}