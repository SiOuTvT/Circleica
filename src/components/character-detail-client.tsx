"use client"

import { Database, Loader2, RefreshCw } from "lucide-react"
import Image from "next/image"
import { Tag, TagGroup } from "@/components/ui/tag"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { TranslateBtn } from "./translate-btn"

interface CharacterData {
  id: string
  name: string
  original?: string
  image?: string
  role?: string
  gender?: string[]
  age?: number | string
  birthday?: number[]
  bloodType?: string
  height?: number | string
  weight?: number | string
  bust?: number | string
  waist?: number | string
  hips?: number | string
  cup?: string
  description?: string
  aliases?: string[]
  traits?: Array<{ name: string; groupName: string }>
  vnTitle?: string
}

const roleMap: Record<string, string> = {
  main: "主角",
  primary: "主要角色",
  side: "次要角色",
  appears: "出场角色",
}

const genderMap: Record<string, string> = {
  m: "男",
  f: "女",
  b: "双性",
  i: "无性别",
  "": "未知",
}

export function CharacterDetailClient({ character, vndbId }: { character: CharacterData; vndbId?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [translated, setTranslated] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch("/api/characters/random", { cache: "no-store" })
      if (!res.ok) throw new Error("获取失败")
      const data = await res.json()
      if (data.id) {
        router.push(`/characters/${data.id}`)
      } else {
        toast.error("暂无角色数据，请稍后重试")
      }
    } catch {
      toast.error("获取失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/50 light:from-white light:via-white light:to-zinc-50 p-4 sm:p-6 lg:p-8 ring-1 ring-border shadow-xl">
        {character.image ? (
          <div className="relative h-48 w-36 sm:h-64 sm:w-48 lg:h-80 lg:w-56 shrink-0 overflow-hidden rounded-xl ring-2 ring-border/50 shadow-lg mx-auto sm:mx-0">
            <Image src={character.image} alt={character.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="flex h-48 w-36 sm:h-64 sm:w-48 lg:h-80 lg:w-56 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-400 text-5xl font-bold text-white ring-2 ring-border/50 shadow-lg mx-auto sm:mx-0">
            {(character.original || character.name)[0]}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-3 mb-3">
            <h1 className="text-3xl font-bold text-foreground">{character.original || character.name}</h1>
            {character.original && character.name !== character.original && (
              <span className="text-base text-muted-foreground">{character.name}</span>
            )}
          </div>

          <TagGroup className="mb-4">
            {character.role && (
              <Tag color="#f472b6">
                {roleMap[character.role] || character.role}
              </Tag>
            )}
            {character.vnTitle && (
              <Tag color="#f472b6">
                {character.vnTitle}
              </Tag>
            )}
            {vndbId && (
              <Tag color="#f472b6" href={`https://vndb.org/${vndbId}`}>
                <Database className="h-3 w-3" strokeWidth={2} />VNDB · {vndbId}
              </Tag>
            )}
          </TagGroup>

          {/* 基本信息 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mb-4 text-sm">
            {character.gender && character.gender.length > 0 && (
              <div><span className="text-muted-foreground">性别: </span><span className="text-foreground">{character.gender.map(g => genderMap[g] || g).join(", ")}</span></div>
            )}
            {character.age && (
              <div><span className="text-muted-foreground">年龄: </span><span className="text-foreground">{character.age}</span></div>
            )}
            {character.birthday && character.birthday.length >= 2 && (
              <div><span className="text-muted-foreground">生日: </span><span className="text-foreground">{character.birthday[0]}月{character.birthday[1]}日</span></div>
            )}
            {character.bloodType && (
              <div><span className="text-muted-foreground">血型: </span><span className="text-foreground">{character.bloodType}</span></div>
            )}
            {character.height && (
              <div><span className="text-muted-foreground">身高: </span><span className="text-foreground">{character.height}cm</span></div>
            )}
            {character.weight && (
              <div><span className="text-muted-foreground">体重: </span><span className="text-foreground">{character.weight}kg</span></div>
            )}
            {character.bust && character.waist && character.hips && (
              <div className="col-span-2"><span className="text-muted-foreground">三围: </span><span className="text-foreground">{character.bust}-{character.waist}-{character.hips}{character.cup ? ` (${character.cup})` : ""}</span></div>
            )}
          </div>

          {/* 别名 */}
          {character.aliases && character.aliases.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1.5">
                {character.aliases.slice(0, 8).map((alias, i) => (
              <span key={i} className="rounded-full bg-pink-400/10 px-2.5 py-0.5 text-xs text-pink-300 ring-1 ring-pink-400/20">
                    {alias}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 特征 */}
      {character.traits && character.traits.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-pink-300 to-pink-400" />
            角色特征
          </h2>
          <TagGroup>
            {character.traits.map((trait, i) => (
              <Tag key={i} color="#f472b6">
                {trait.name}
              </Tag>
            ))}
          </TagGroup>
        </section>
      )}

      {/* 描述 */}
      {character.description && (() => {
        const cleaned = character.description.replace(/\[.*?\]/g, "").replace(/\[url=[^\]]*\]([^[]*)\[\/url\]/g, "$1").trim()
        return (
          <section className="mb-6">
            <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-pink-300 to-pink-400" />
            角色简介
              {!translated && <TranslateBtn text={cleaned} onTranslated={setTranslated} />}
              {translated && (
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="flex items-center gap-1.5 rounded-lg bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border transition-all hover:bg-secondary hover:text-white"
                >
                  {showOriginal ? "查看翻译" : "查看原文"}
                </button>
              )}
            </h2>
            <div className="rounded-2xl bg-card/50 p-6 ring-1 ring-border">
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {translated && !showOriginal ? translated : cleaned}
              </p>
            </div>
          </section>
        )
      })()}

      {/* 换一个按钮 */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-pink-400/15 px-6 py-3 text-sm font-medium text-pink-300 ring-1 ring-pink-400/25 transition-all hover:bg-pink-400/25 hover:text-pink-200 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          换一个角色
        </button>
      </div>
    </div>
  )
}