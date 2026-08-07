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

/**
 * 封面分级（专业命名，两级为主）：
 *  - SFW 安全（coverSexual 0/1）：封面无成人内容（含温和擦边），安全模式下正常显示
 *  - NSFW 露骨（coverSexual 2）：封面含成人内容，安全模式下不渲染 URL（防平台检测）
 *  - 待审核（-1）：VNDB 未评级、自动识别低置信，需人工裁决
 */
const LEVEL_META: Record<number, { label: string; cls: string }> = {
  0: { label: "SFW 安全", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/25" },
  1: { label: "SFW 温和", cls: "bg-teal-500/15 text-teal-600 dark:text-teal-400 ring-teal-500/30 hover:bg-teal-500/25" },
  2: { label: "NSFW 露骨", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/30 hover:bg-rose-500/25" },
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
      toast.success(level === 2 ? "已标为 NSFW 露骨" : "已标为 SFW 安全")
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((it) => {
        const meta = it.coverSexual < 0 ? null : LEVEL_META[it.coverSexual] ?? LEVEL_META[0]
        return (
          <div key={it.id} className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="relative aspect-[3/4] w-full bg-muted">
              {it.coverImage ? (
                <SafeImage src={it.coverImage} alt={it.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 220px" quality={60} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground/40">无封面</div>
              )}
              <span
                className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${
                  meta ? meta.cls : "bg-slate-500/15 text-slate-500 ring-slate-500/30"
                }`}
              >
                {meta ? meta.label : "待审核"}
              </span>
            </div>
            <div className="space-y-1.5 p-2">
              <div className="min-w-0">
                <a href={it.workHref} target="_blank" rel="noopener noreferrer" className="line-clamp-1 text-xs font-semibold hover:text-[var(--gal-accent)]">
                  {it.title}
                </a>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {it.vndbRating ? `VNDB ${it.vndbRating.toFixed(2)}` : "无评分"} · {it.viewCount} 浏览
                </p>
              </div>
              {/* 两级裁决：SFW 安全 / NSFW 露骨（对应写库 0 / 2） */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={busyId === it.id}
                  onClick={() => rate(it.id, 0)}
                  className={`flex-1 rounded px-1.5 py-1 text-[11px] font-medium ring-1 transition-colors ${
                    it.coverSexual === 0 || it.coverSexual === 1
                      ? LEVEL_META[0].cls
                      : "bg-transparent text-muted-foreground ring-border hover:bg-muted"
                  }`}
                  title="封面无成人内容，安全模式正常显示"
                >
                  SFW
                </button>
                <button
                  type="button"
                  disabled={busyId === it.id}
                  onClick={() => rate(it.id, 2)}
                  className={`flex-1 rounded px-1.5 py-1 text-[11px] font-medium ring-1 transition-colors ${
                    it.coverSexual === 2 ? LEVEL_META[2].cls : "bg-transparent text-muted-foreground ring-border hover:bg-muted"
                  }`}
                  title="封面含成人内容，安全模式不渲染"
                >
                  NSFW
                </button>
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
    { key: "explicit", label: "已标 NSFW" },
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
