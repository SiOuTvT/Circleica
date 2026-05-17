"use client"

import { TranslateBtn } from "@/components/translate-btn"
import { Database, Loader2, RefreshCw, Star, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface CreatorData {
  id: string
  name: string
  original?: string
  description?: string
  gender?: string
  vndbId: string
  roles: string[]
  vns: Array<{
    id: string
    title: string
    original?: string
    role: string
    rating?: number
    image?: string
  }>
}

const roleLabelMap: Record<string, string> = {
  scenario: "脚本",
  art: "原画",
  music: "音乐",
  songs: "歌曲",
  voice: "配音",
  director: "导演",
  staff: "其他",
  editing: "编辑",
  quality_assurance: "测试",
}

function formatRating(rating?: number) {
  if (!rating) return null
  // VNDB rating is 10-100, normalize to 10.0 scale
  const normalized = rating / 10
  return normalized.toFixed(1)
}

export function CreatorDetailClient({ creator }: { creator: CreatorData }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [translated, setTranslated] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch("/api/creators/random", { cache: "no-store" })
      if (!res.ok) throw new Error("获取失败")
      const data = await res.json()
      if (data.id) {
        router.push(`/creators/${data.id}`)
      } else {
        toast.error("暂无创作者数据，请稍后重试")
      }
    } catch {
      toast.error("获取失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  const genderLabel = creator.gender === "m" ? "男性" : creator.gender === "f" ? "女性" : ""

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 flex flex-col items-start gap-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/50 light:from-white light:via-white light:to-zinc-50 p-8 ring-1 ring-white/[0.08] light:ring-black/[0.08] shadow-xl">
        <div className="flex flex-col sm:flex-row items-start gap-6 w-full">
          {/* Avatar placeholder */}
          <div className="flex h-32 w-32 sm:h-40 sm:w-40 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-400 ring-2 ring-white/10 light:ring-black/10 shadow-lg mx-auto sm:mx-0">
            <User className="h-16 w-16 text-white/80" strokeWidth={1.5} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-3 mb-3">
              <h1 className="text-3xl font-bold text-zinc-100 light:text-zinc-900">
                {creator.original || creator.name}
              </h1>
              {creator.original && creator.name !== creator.original && (
                <span className="text-base text-zinc-500 light:text-zinc-400">{creator.name}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {/* 角色标签 */}
              {creator.roles.map(role => (
                <span
                  key={role}
                  className="rounded-full bg-indigo-400/15 px-3 py-1 text-xs font-medium text-indigo-400 ring-1 ring-indigo-400/25"
                >
                  {roleLabelMap[role] || role}
                </span>
              ))}
              {genderLabel && (
                <span className="rounded-full bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-300 ring-1 ring-indigo-400/20">
                  {genderLabel}
                </span>
              )}
              {creator.vndbId && (
                <a
                  href={`https://vndb.org/s${creator.vndbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-300 ring-1 ring-indigo-400/20 transition-all hover:bg-indigo-400/20 hover:text-indigo-200"
                >
                  <Database className="h-3 w-3" strokeWidth={2} />
                  VNDB · s{creator.vndbId}
                </a>
              )}
            </div>

            {/* 参与作品数 */}
            <div className="text-sm text-zinc-500 light:text-zinc-400">
              参与作品: {creator.vns.length} 部
            </div>
          </div>
        </div>
      </div>

      {/* 描述 */}
      {creator.description && (() => {
        const cleaned = creator.description
          .replace(/\[.*?\]/g, "")
          .replace(/\[url=[^\]]*\]([^[]*)\[\/url\]/g, "$1")
          .trim()
        if (!cleaned) return null
        return (
          <section className="mb-6">
            <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-zinc-200 light:text-zinc-800">
              <span className="h-5 w-1 rounded-full bg-gradient-to-b from-indigo-300 to-indigo-400" />
              创作者简介
              {!translated && <TranslateBtn text={cleaned} onTranslated={setTranslated} />}
              {translated && (
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 light:bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-300 light:text-zinc-600 ring-1 ring-white/[0.08] light:ring-black/[0.08] transition-all hover:bg-zinc-700 light:hover:bg-zinc-200 hover:text-white light:hover:text-zinc-900"
                >
                  {showOriginal ? "查看翻译" : "查看原文"}
                </button>
              )}
            </h2>
            <div className="rounded-2xl bg-zinc-900/50 light:bg-zinc-100 p-6 ring-1 ring-white/[0.06] light:ring-black/[0.06]">
              <p className="text-sm leading-relaxed text-zinc-400 light:text-zinc-600 whitespace-pre-line">
                {translated && !showOriginal ? translated : cleaned}
              </p>
            </div>
          </section>
        )
      })()}

      {/* 参与作品列表 */}
      {creator.vns.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-zinc-200 light:text-zinc-800">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-indigo-300 to-indigo-400" />
            参与作品
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {creator.vns.map(vn => (
              <Link
                key={vn.id}
                href={`/games?vndb=${vn.id}`}
                className="group overflow-hidden rounded-xl bg-zinc-900 light:bg-white ring-1 ring-white/[0.06] light:ring-black/[0.06] transition-all hover:-translate-y-1 hover:ring-white/[0.12] light:hover:ring-black/[0.12] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
              >
                <div className="relative" style={{ aspectRatio: "4/5" }}>
                  {vn.image ? (
                    <Image src={vn.image} alt={vn.title} fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                      sizes="(max-width: 640px) 33vw, 16vw" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 light:bg-zinc-100 text-zinc-600 text-xs">无封面</div>
                  )}
                  {vn.rating ? (
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-amber-400 backdrop-blur-sm">
                      <Star className="h-2.5 w-2.5" strokeWidth={2} />
                      {formatRating(vn.rating)}
                    </div>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/90 to-transparent p-2">
                    <p className="line-clamp-2 text-[10px] font-medium leading-tight text-zinc-200">{vn.original || vn.title}</p>
                    <p className="mt-0.5 text-[9px] text-zinc-500">{roleLabelMap[vn.role] || vn.role}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 换一个按钮 */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-indigo-400/15 px-6 py-3 text-sm font-medium text-indigo-300 ring-1 ring-indigo-400/25 transition-all hover:bg-indigo-400/25 hover:text-indigo-200 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          换一个创作者
        </button>
      </div>
    </div>
  )
}