"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SafeImage } from "@/components/safe-image"
import { adminBtnSubtle, adminBtnSecondary } from "@/lib/admin-styles"
import { setWorkCoverSexual } from "./actions"

export interface ReviewItem {
  id: string
  title: string
  coverImage: string
  coverSexual: number
  vndbRating: number | null
  viewCount: number
  workHref: string
}

const LEVEL_META: Record<number, { label: string; cls: string }> = {
  0: { label: "安全", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/25" },
  1: { label: "暗示", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30 hover:bg-amber-500/25" },
  2: { label: "露骨", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/30 hover:bg-rose-500/25" },
}

export function NsfwReviewClient({ items, filter }: { items: ReviewItem[]; filter: string }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function rate(id: string, level: number) {
    setBusyId(id)
    try {
      const fd = new FormData()
      fd.set("workId", id)
      fd.set("level", String(level))
      await setWorkCoverSexual(fd)
      toast.success(`已标定为「${LEVEL_META[level].label}」`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "标定失败")
    } finally {
      setBusyId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {filter === "ungraded" ? "没有待审核的作品——VNDB 分级 + 自动识别已全覆盖" : "没有符合条件的作品"}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((it) => {
        const meta = LEVEL_META[it.coverSexual] ?? LEVEL_META[0]
        return (
          <div key={it.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative aspect-[3/4] w-full bg-muted">
              {it.coverImage ? (
                <SafeImage src={it.coverImage} alt={it.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 400px" quality={70} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/40">无封面</div>
              )}
              <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${meta.cls}`}>
                {it.coverSexual < 0 ? "未定级" : meta.label}
              </span>
            </div>
            <div className="space-y-2 p-3">
              <div className="min-w-0">
                <a href={it.workHref} target="_blank" rel="noopener noreferrer" className="line-clamp-1 text-sm font-semibold hover:text-[var(--gal-accent)]">
                  {it.title}
                </a>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {it.vndbRating ? `VNDB ${it.vndbRating.toFixed(2)}` : "VNDB 无评分"} · 浏览 {it.viewCount}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    disabled={busyId === it.id}
                    onClick={() => rate(it.id, lv)}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ring-1 transition-colors ${
                      it.coverSexual === lv
                        ? LEVEL_META[lv].cls
                        : "bg-transparent text-muted-foreground ring-border hover:bg-muted"
                    }`}
                  >
                    {LEVEL_META[lv].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function NsfwReviewFilter({ filter }: { filter: string }) {
  const router = useRouter()
  const options = [
    { key: "ungraded", label: "待审核（未定级）" },
    { key: "all", label: "全部" },
    { key: "explicit", label: "已标露骨" },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => router.push(`/admin/galvelica/nsfw-review?filter=${o.key}`)}
          className={filter === o.key ? adminBtnSecondary : adminBtnSubtle}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
