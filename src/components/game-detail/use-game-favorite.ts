"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { apiFetchSafe } from "@/lib/api-client"

/**
 * 游戏收藏 —— 单一职责 hook。
 *
 * 详情页首屏按钮（GameDetailTopClient）与档案卡底部收藏长条（GameInfoActions）
 * 共用这一份实现，避免收藏流程（未登录拦截 / 合集选择 / 取消确认 / 乐观更新 +
 * 跨组件 game-fav-change 广播）在同一页里长出两套分支彼此带偏。
 */
export function useGameFavorite(gameId: string) {
  const { status } = useSession()
  const isLoggedIn = status === "authenticated"
  const [fav, setFav] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [unfavoriting, setUnfavoriting] = useState(false)

  // A-8：个性化收藏状态改由客户端 API 拉取（页面已走 Data Cache），避免污染缓存键。
  useEffect(() => {
    let cancelled = false
    apiFetchSafe<{ isFav: boolean }>(`/api/games/${gameId}/personalization`)
      .then(({ ok, data }) => {
        if (ok && data && !cancelled) setFav(data.isFav)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [gameId])

  // 与 GameDetailClient 跨组件同步收藏态
  useEffect(() => {
    const onFavChange = (e: Event) => {
      const detail = (e as CustomEvent<{ isFav: boolean }>).detail
      setFav(detail.isFav)
    }
    window.addEventListener("game-fav-change", onFavChange)
    return () => window.removeEventListener("game-fav-change", onFavChange)
  }, [])

  function handleFavoriteClick() {
    if (!isLoggedIn) return
    if (fav) {
      setConfirmOpen(true)
    } else {
      setDialogOpen(true)
    }
  }

  async function handleUnfavorite() {
    setUnfavoriting(true)
    try {
      const { ok } = await apiFetchSafe(`/api/games/${gameId}/favorite`, {
        method: "POST",
      })
      if (ok) {
        setFav(false)
        window.dispatchEvent(new CustomEvent("game-fav-change", { detail: { isFav: false } }))
        toast.success("已取消收藏")
      }
    } finally {
      setUnfavoriting(false)
    }
  }

  function handleSelect(_collectionId: string | null) {
    setFav(true)
    window.dispatchEvent(new CustomEvent("game-fav-change", { detail: { isFav: true } }))
    toast.success("已收藏")
  }

  return {
    isLoggedIn,
    fav,
    unfavoriting,
    dialogOpen,
    setDialogOpen,
    confirmOpen,
    setConfirmOpen,
    handleFavoriteClick,
    handleUnfavorite,
    handleSelect,
  }
}
