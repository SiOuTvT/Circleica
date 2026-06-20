"use client"

import { useEffect, useState, useCallback } from "react"
import { logger } from "@/lib/logger"

interface GameLite {
  id: string
  serialId?: number
  title: string
  coverImage?: string
  isNsfw?: boolean
  originalWork?: string
}

interface CommentLite {
  id: string
  content: string
  createdAt: Date
  game: { id: string; serialId?: number; title: string }
}

interface ProfileData {
  favGames: GameLite[]
  playStatusGames: { game: GameLite; status: string }[]
  comments: CommentLite[]
  loading: {
    fav: boolean
    play: boolean
    comments: boolean
  }
  error: {
    fav: boolean
    play: boolean
    comments: boolean
  }
}

interface ProfileDataLoaderProps {
  userId: string
  initialFavGames?: GameLite[]
  initialPlayGames?: { game: GameLite; status: string }[]
  initialComments?: CommentLite[]
  children: (data: ProfileData, loadTab: (tab: "fav" | "play" | "comments") => void) => React.ReactNode
}

export function ProfileDataLoader({
  userId,
  initialFavGames = [],
  initialPlayGames = [],
  initialComments = [],
  children,
}: ProfileDataLoaderProps) {
  const [data, setData] = useState<ProfileData>({
    favGames: initialFavGames,
    playStatusGames: initialPlayGames,
    comments: initialComments,
    loading: { fav: false, play: false, comments: false },
    error: { fav: false, play: false, comments: false },
  })

  const loadTab = useCallback((tab: "fav" | "play" | "comments") => {
    if (tab === "fav" && initialFavGames.length === 0 && !data.loading.fav) {
      setData(d => ({ ...d, loading: { ...d.loading, fav: true } }))
      fetch(`/api/profile/${userId}/favorites`)
        .then(r => r.json())
        .then(favGames => {
          setData(d => ({
            ...d,
            favGames,
            loading: { ...d.loading, fav: false },
          }))
        })
        .catch(() => {
          setData(d => ({ ...d, error: { ...d.error, fav: true }, loading: { ...d.loading, fav: false } }))
          logger.profile.error("Failed to load favorites")
        })
    }

    if (tab === "play" && initialPlayGames.length === 0 && !data.loading.play) {
      setData(d => ({ ...d, loading: { ...d.loading, play: true } }))
      fetch(`/api/profile/${userId}/play-status`)
        .then(r => r.json())
        .then(playGames => {
          setData(d => ({
            ...d,
            playStatusGames: playGames,
            loading: { ...d.loading, play: false },
          }))
        })
        .catch(() => {
          setData(d => ({ ...d, error: { ...d.error, play: true }, loading: { ...d.loading, play: false } }))
          logger.profile.error("Failed to load play status")
        })
    }

    if (tab === "comments" && initialComments.length === 0 && !data.loading.comments) {
      setData(d => ({ ...d, loading: { ...d.loading, comments: true } }))
      fetch(`/api/profile/${userId}/comments`)
        .then(r => r.json())
        .then(comments => {
          setData(d => ({
            ...d,
            comments,
            loading: { ...d.loading, comments: false },
          }))
        })
        .catch(() => {
          setData(d => ({ ...d, error: { ...d.error, comments: true }, loading: { ...d.loading, comments: false } }))
          logger.profile.error("Failed to load comments")
        })
    }
  }, [userId, initialFavGames.length, initialPlayGames.length, initialComments.length, data.loading])

  return <>{children(data, loadTab)}</>
}