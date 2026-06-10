"use client"

import { Building2, Calendar, ChevronDown, Clock, ExternalLink, Gamepad2 } from "lucide-react"
import Link from "next/link"

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
        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors"
        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" style={{ opacity: 0.6 }} />
          游戏档案
        </span>
        <ChevronDown
          className="h-4 w-4 transition-transform duration-200"
          style={{ opacity: 0.6, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {isOpen && (
        <div className="mt-2 space-y-2.5 rounded-xl p-2.5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {releaseDate && (
            <div className="flex items-center gap-2.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
              <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>发售日期</span>
              <span className="ml-auto text-xs font-semibold" style={{ color: "var(--foreground)" }}>{releaseDate}</span>
            </div>
          )}
          {studioName && (
            <div className="flex items-center gap-2.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
              <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>制作会社</span>
              <span className="ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>{studioName}</span>
            </div>
          )}
          {gameDuration && (
            <div className="flex items-center gap-2.5">
              <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
              <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>游戏时长</span>
              <span className="ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>{gameDuration}</span>
            </div>
          )}
          {vndbId && (() => {
            const rawId = vndbId.startsWith("v") ? vndbId : `v${vndbId}`
            const numericId = rawId.replace(/^v/, "")
            return (
              <div className="flex items-center gap-2.5">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>VNDB</span>
                <a href={`https://vndb.org/v${numericId}`} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all hover:opacity-80" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>v{numericId}</a>
              </div>
            )
          })()}
          {gameTags && gameTags.length > 0 && (
            <div className="flex items-start gap-2.5">
              <Gamepad2 className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "var(--muted-foreground)" }} />
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>游戏标签</span>
              {gameTags.map((tag, i) => (
                  <Link
                    key={i}
                    href={`/games?tag=${encodeURIComponent(tag.name)}`}
                    className="inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-semibold transition-opacity hover:opacity-80"
                    style={{ background: tag.color || "var(--secondary)", color: "#fff" }}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}