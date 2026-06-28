"use client"

import { Building2, Calendar, ChevronDown, Clock, ExternalLink, Gamepad2 } from "lucide-react"
import { Tag } from "@/components/ui/tag"

export function ArchiveCard({
  releaseDate,
  studioName,
  gameDuration,
  vndbId,
  gameTags,
  isOpen,
  onToggle,
}: {
  releaseDate?: string
  studioName?: string
  gameDuration?: string
  vndbId?: string
  gameTags?: { name: string; color: string; groupName?: string }[]
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="mt-6 lg:hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-colors bg-card ring-1 ring-border text-foreground"
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4 opacity-60" />
          游戏档案
        </span>
        <ChevronDown
          className="h-4 w-4 transition-transform duration-200 opacity-60"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: isOpen ? "500px" : "0px", opacity: isOpen ? 1 : 0 }}
      >
        <div className="mt-2 space-y-3 rounded-2xl p-4 bg-card ring-1 ring-border">
          {releaseDate && (
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs shrink-0 text-muted-foreground">发售日期</span>
              <span className="ml-auto text-xs font-semibold text-foreground">{releaseDate}</span>
            </div>
          )}
          {studioName && (
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs shrink-0 text-muted-foreground">制作会社</span>
              <span className="ml-auto inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold bg-secondary text-foreground">{studioName}</span>
            </div>
          )}
          {gameDuration && (
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs shrink-0 text-muted-foreground">游戏时长</span>
              <span className="ml-auto inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold bg-secondary text-foreground">{gameDuration}</span>
            </div>
          )}
          {vndbId && (() => {
            const rawId = vndbId.startsWith("v") ? vndbId : `v${vndbId}`
            const numericId = rawId.replace(/^v/, "")
            return (
              <div className="flex items-center gap-2.5">
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-xs shrink-0 text-muted-foreground">VNDB</span>
                <a href={`https://vndb.org/v${numericId}`} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-80 bg-secondary text-foreground">v{numericId}</a>
              </div>
            )
          })()}
          {gameTags && gameTags.length > 0 && (
            <div className="flex items-start gap-2.5">
              <Gamepad2 className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
                <span className="text-xs shrink-0 text-muted-foreground">游戏标签</span>
                {gameTags.map((tag, i) => (
                  <Tag
                    key={i}
                    color={tag.color || undefined}
                    href={`/games?tag=${encodeURIComponent(tag.name)}`}
                  >
                    {tag.name}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
