"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { ExternalLink, User } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
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
    return <EmptyState icon={User} title="暂无创作者" />
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {creators.map((creator) => (
          <div
            key={creator.id}
            className="group flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-border transition-all duration-200 hover:ring-foreground/10 hover:shadow-2"
          >
            {/* 头像 + 名称（点击查看详情） */}
            <button
              type="button"
              onClick={() => setSelectedCreator(creator)}
              className="flex items-center gap-3 text-left cursor-pointer"
            >
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                {creator.avatar ? (
                  <Image src={creator.avatar} alt={creator.name} width={36} height={36} className="h-full w-full object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-400 text-xs font-bold text-white">
                    {creator.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground truncate">{creator.name}</span>
                  {creator.nameJa && (
                    <span className="text-xs text-muted-foreground truncate">({creator.nameJa})</span>
                  )}
                </div>
              </div>
            </button>

            {/* 元信息：性别 / VNDB / 作品数 */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>性别：{creator.gender || "—"}</span>
              {creator.vndbId ? (
                <a
                  href={`https://vndb.org/s${creator.vndbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {creator.vndbId}
                </a>
              ) : (
                <span>VNDB：—</span>
              )}
              <span>作品 {creator.gameCount}</span>
            </div>

            {/* 操作：查看 / 删除 */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setSelectedCreator(creator)}
                className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground cursor-pointer"
              >
                查看
              </button>
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
