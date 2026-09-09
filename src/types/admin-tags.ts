/**
 * 后台标签管理类型定义
 */

export interface TagInGroup {
  id: string
  name: string
  color: string
  gameCount: number
  groupId?: string | null
  description?: string
  sortOrder?: number
  isVisible?: boolean
}

export interface TagGroup {
  id: string
  name: string
  description: string
  color: string
  positions: string[]
  isPreset?: boolean
  tags: TagInGroup[]
}

export interface AdminTagApiResponse<T> {
  success?: boolean
  data?: T
  confirm?: boolean
  error?: string
  tagCount?: number
  gameCount?: number
}
