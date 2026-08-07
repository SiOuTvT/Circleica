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
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold tracking-wide">创作者</th>
                <th className="hidden px-5 py-3.5 font-semibold tracking-wide sm:table-cell">性别</th>
                <th className="hidden px-5 py-3.5 font-semibold tracking-wide md:table-cell">VNDB</th>
                <th className="px-5 py-3.5 font-semibold tracking-wide text-right">作品数</th>
                <th className="px-5 py-3.5 font-semibold tracking-wide text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {creators.map((creator) => (
                <tr key={creator.id} className="group transition-colors hover:bg-accent/30">
                  <td className="px-5 py-3.5">
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
                  </td>
                  <td className="hidden px-5 py-3.5 text-xs text-muted-foreground sm:table-cell">
                    {creator.gender || "—"}
                  </td>
                  <td className="hidden px-5 py-3.5 text-xs text-muted-foreground md:table-cell">
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
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs text-muted-foreground tabular-nums">
                    {creator.gameCount}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCreator(creator)}
                        className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground cursor-pointer"
                      >
                        查看
                      </button>
                      <CreatorDeleteBtn id={creator.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreatorDetailDialog
        creator={selectedCreator}
        onClose={() => setSelectedCreator(null)}
      />
    </>
  )
}
