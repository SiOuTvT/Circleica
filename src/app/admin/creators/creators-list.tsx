"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { CreatorDetailDialog } from "./creator-detail-dialog"

const CreatorDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.CreatorDeleteBtn })), {
  loading: () => <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />,
})

interface Creator {
  id: string
  name: string
  nameJa: string | null
  avatar: string | null
  gender: string | null
  vndbId: string | null
  gameCount: number
}

export function CreatorsList({ creators }: { creators: Creator[] }) {
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null)

  if (creators.length === 0) {
    return null
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {creators.map((creator) => (
          <div
            key={creator.id}
            onClick={() => setSelectedCreator(creator)}
            className="group relative flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-border transition-all duration-200 hover:ring-primary/40 hover:shadow-md cursor-pointer"
          >
            {/* 头像 */}
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
              {creator.avatar ? (
                <Image src={creator.avatar} alt={creator.name} width={40} height={40} className="h-full w-full object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-400 text-xs font-bold text-white">
                  {creator.name.charAt(0)}
                </div>
              )}
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground truncate">{creator.name}</span>
                {creator.nameJa && (
                  <span className="text-xs text-muted-foreground truncate">({creator.nameJa})</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {creator.gender && (
                  <span className="text-[10px] text-muted-foreground">{creator.gender}</span>
                )}
                {creator.vndbId && (
                  <span className="text-[10px] text-muted-foreground">VNDB:{creator.vndbId}</span>
                )}
              </div>
            </div>

            {/* 游戏数 */}
            <div className="text-right shrink-0">
              <span className="text-lg font-bold text-foreground">{creator.gameCount}</span>
              <p className="text-[10px] text-muted-foreground">个游戏</p>
            </div>

            {/* 删除按钮 */}
            <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <CreatorDeleteBtn id={creator.id} />
            </div>
          </div>
        ))}
      </div>

      <CreatorDetailDialog
        creator={selectedCreator}
        onClose={() => setSelectedCreator(null)}
      />
    </>
  )
}
