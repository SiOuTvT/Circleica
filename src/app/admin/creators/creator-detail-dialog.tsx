"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ExternalLink, Loader2, User } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"

interface CreatorInfo {
  id: string
  name: string
  nameJa: string | null
  avatar: string | null
  gender: string | null
  vndbId: string | null
  gameCount: number
}

interface GameItem {
  id: string
  title: string
  roles: string[]
}

interface CreatorDetailDialogProps {
  creator: CreatorInfo | null
  onClose: () => void
}

const ROLE_LABELS: Record<string, string> = {
  scenario: "脚本",
  art: "原画",
  chardesign: "角色设计",
  music: "音乐",
  songs: "歌曲",
  director: "导演",
  other: "其他",
}

export function CreatorDetailDialog({ creator, onClose }: CreatorDetailDialogProps) {
  const [games, setGames] = useState<GameItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!creator) { setGames([]); return }
    setLoading(true)
    fetch(`/api/admin/creators/${creator.id}/games`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setGames(data))
      .catch(() => setGames([]))
      .finally(() => setLoading(false))
  }, [creator])

  if (!creator) return null

  return (
    <Dialog open={!!creator} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* 头部区域 */}
        <div className="relative bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="sr-only">创作者详情</DialogTitle>
          </DialogHeader>

          <div className="flex items-start gap-4">
            {/* 头像 */}
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted ring-2 ring-background shadow-md">
              {creator.avatar ? (
                <Image src={creator.avatar} alt={creator.name} width={64} height={64} className="h-full w-full object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-400">
                  <User className="h-7 w-7 text-white/80" />
                </div>
              )}
            </div>

            {/* 基本信息 */}
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-lg font-bold text-foreground leading-tight">{creator.name}</h3>
              {creator.nameJa && (
                <p className="text-sm text-muted-foreground mt-0.5">{creator.nameJa}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {creator.gender && (
                  <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-secondary/80 rounded-full px-2.5 py-1 ring-1 ring-border">
                    {creator.gender}
                  </span>
                )}
                <span className="inline-flex items-center text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-1 ring-1 ring-primary/20">
                  {creator.gameCount} 个作品
                </span>
                {creator.vndbId && (
                  <a
                    href={`https://vndb.org/s${creator.vndbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-secondary/80 rounded-full px-2.5 py-1 ring-1 ring-border hover:ring-primary/40 hover:text-foreground transition-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    VNDB
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 作品列表 */}
        <div className="p-5 pt-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">作品列表</h4>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : games.length > 0 ? (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {games.map((game, i) => (
                <div
                  key={game.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/40 transition-colors"
                >
                  <span className="flex items-center justify-center h-7 w-7 rounded-md bg-muted text-xs font-bold text-muted-foreground shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-foreground truncate">{game.title}</span>
                  <div className="flex flex-wrap gap-1 shrink-0">
                    {game.roles.map(r => (
                      <span key={r} className="text-xs text-muted-foreground bg-secondary rounded px-2 py-0.5">
                        {ROLE_LABELS[r] || r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <p className="text-sm text-muted-foreground">暂无作品</p>
              <p className="text-xs text-muted-foreground/60 mt-1">通过 VNDB 导入游戏时会自动关联</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
