// 类型定义
export interface User {
  id: string
  username: string
  avatar: string
}

export interface Comment {
  id: string
  content: string
  imageUrl: string
  likeCount: number
  createdAt: string
  updatedAt?: string
  user: User
}

export interface Post {
  id: string
  title: string
  content: string
  imageUrl: string
  likeCount: number
  commentCount: number
  isSolved: boolean
  isPinned: boolean
  isLocked: boolean
  category: string
  viewCount: number
  updatedAt: string
  createdAt: string
  user: User
  comments?: Comment[]
}