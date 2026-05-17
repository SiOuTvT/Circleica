/**
 * Game detail page consolidated data type
 * Used by the refactored game-detail-client.tsx
 */
export interface GameDetailData {
  id: string
  title: string
  description: string | null
  banner: string | null
  coverUrl: string | null
  releaseDate: string | null
  studioName: string | null
  gameDuration: string | null
  vndbId: string | null
  remark: string | null
  isFav: boolean
  favCount: number
  viewCount: number
  downloadCount: number
  gallery: string[]
  downloadLinks: { label: string; url: string }[]
  tags: { name: string; color: string; group?: { name?: string } }[]
  creators: { id: string; name: string; nameJa: string | null; avatar: string | null; role: string }[]
  comments: {
    id: string
    content: string
    imageUrl: string | null
    likeCount: number
    createdAt: string
    user: { id: string; username: string; avatar: string | null }
    replies: {
      id: string
      content: string
      imageUrl: string | null
      likeCount: number
      createdAt: string
      user: { id: string; username: string; avatar: string | null }
      replies: []
    }[]
  }[]
  _count: { comments: number }
}