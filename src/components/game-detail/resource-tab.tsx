"use client"

import type { Creator, DownloadLink } from "@/types/game"
import { Download, Heart } from "lucide-react"

interface ResourceTabProps {
  downloadLinks: DownloadLink[]
  creators: Creator[]
  isLoggedIn: boolean
  isFav: boolean
  favCount: number
  onToggleFav: () => void
  roleLabels: Record<string, string>
}

export function ResourceTab({
  downloadLinks,
  creators,
  isLoggedIn,
  isFav,
  favCount,
  onToggleFav,
  roleLabels,
}: ResourceTabProps) {
  return (
    <div className="space-y-5">
      {/* 下载链接 */}
      {downloadLinks.length > 0 ? (
        <div className="space-y-2">
          {downloadLinks.map((dl, i) => (
            <a
              key={i}
              href={dl.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--clr-blue)" }}
            >
              <Download className="w-4 h-4" strokeWidth={2.5} />
              {dl.label || "下载"}
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">暂无下载链接</p>
      )}

      {/* 收藏按钮 */}
      <button
        onClick={onToggleFav}
        disabled={!isLoggedIn}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all disabled:opacity-50"
        style={{
          backgroundColor: isFav ? "var(--clr-blue)" : "hsl(var(--secondary))",
          color: isFav ? "#000" : "hsl(var(--muted-foreground))",
        }}
      >
        <Heart className="w-4 h-4" strokeWidth={2} fill={isFav ? "#000" : "none"} />
        {isFav ? "已收藏" : "收藏"} ({favCount})
      </button>

      {/* 制作人员 */}
      {creators.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">制作人员</h3>
          <div className="space-y-3">
            {creators.map((c) => (
              <a
                key={`${c.id}-${c.role}`}
                href={`/creators/${c.id}`}
                className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"
              >
                {c.avatar ? (
                  <img src={c.avatar} alt={c.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg, var(--clr-sky), var(--clr-blue))" }}
                  >
                    {(c.nameJa || c.name)[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{c.nameJa || c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabels[c.role] ?? c.role}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}