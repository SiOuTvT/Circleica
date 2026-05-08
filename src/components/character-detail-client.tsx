"use client"

import { Loader2, RefreshCw } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { TranslatableDescription } from "./translatable-description"

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

export function CharacterDetailClient({ character }: { character: CharacterData }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch("/api/characters/random", { cache: "no-store" })
      if (!res.ok) throw new Error("获取失败")
      const data = await res.json()
      if (data.id) {
        router.push(`/characters/${data.id}`)
      } else {
        alert("暂无角色数据，请稍后重试")
      }
    } catch {
      alert("获取失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="mb-8 flex flex-col sm:flex-row items-start gap-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800/50 light:from-white light:via-white light:to-zinc-50 p-8 ring-1 ring-white/[0.08] light:ring-black/[0.08] shadow-xl">
        {character.image ? (
          <div className="relative h-64 w-48 sm:h-80 sm:w-56 shrink-0 overflow-hidden rounded-xl ring-2 ring-white/10 light:ring-black/10 shadow-lg mx-auto sm:mx-0">
            <Image src={character.image} alt={character.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="flex h-64 w-48 sm:h-80 sm:w-56 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-400 text-5xl font-bold text-white ring-2 ring-white/10 light:ring-black/10 shadow-lg mx-auto sm:mx-0">
            {(character.original || character.name)[0]}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-3 mb-3">
            <h1 className="text-3xl font-bold text-zinc-100 light:text-zinc-900">{character.original || character.name}</h1>
            {character.original && character.name !== character.original && (
              <span className="text-base text-zinc-500 light:text-zinc-400">{character.name}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {character.role && (
              <span className="rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-3 py-1 text-xs font-medium text-purple-400 ring-1 ring-purple-500/30">
                {roleMap[character.role] || character.role}
              </span>
            )}
            {character.vnTitle && (
              <span className="rounded-full bg-zinc-800/80 light:bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-300 light:text-zinc-600 ring-1 ring-white/[0.08] light:ring-black/[0.08]">
                {character.vnTitle}
              </span>
            )}
          </div>

          {/* 基本信息 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mb-4 text-sm">
            {character.gender && character.gender.length > 0 && (
              <div><span className="text-zinc-500 light:text-zinc-400">性别: </span><span className="text-zinc-200 light:text-zinc-700">{character.gender.map(g => genderMap[g] || g).join(", ")}</span></div>
            )}
            {character.age && (
              <div><span className="text-zinc-500 light:text-zinc-400">年龄: </span><span className="text-zinc-200 light:text-zinc-700">{character.age}</span></div>
            )}
            {character.birthday && (
              <div><span className="text-zinc-500 light:text-zinc-400">生日: </span><span className="text-zinc-200 light:text-zinc-700">{character.birthday[0]}月{character.birthday[1]}日</span></div>
            )}
            {character.bloodType && (
              <div><span className="text-zinc-500 light:text-zinc-400">血型: </span><span className="text-zinc-200 light:text-zinc-700">{character.bloodType}</span></div>
            )}
            {character.height && (
              <div><span className="text-zinc-500 light:text-zinc-400">身高: </span><span className="text-zinc-200 light:text-zinc-700">{character.height}cm</span></div>
            )}
            {character.weight && (
              <div><span className="text-zinc-500 light:text-zinc-400">体重: </span><span className="text-zinc-200 light:text-zinc-700">{character.weight}kg</span></div>
            )}
            {character.bust && character.waist && character.hips && (
              <div className="col-span-2"><span className="text-zinc-500 light:text-zinc-400">三围: </span><span className="text-zinc-200 light:text-zinc-700">{character.bust}-{character.waist}-{character.hips}{character.cup ? ` (${character.cup})` : ""}</span></div>
            )}
          </div>

          {/* 别名 */}
          {character.aliases && character.aliases.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1.5">
                {character.aliases.slice(0, 8).map((alias, i) => (
                  <span key={i} className="rounded-full bg-zinc-800/80 light:bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-400 light:text-zinc-500 ring-1 ring-white/[0.06] light:ring-black/[0.06]">
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
          <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-zinc-200 light:text-zinc-800">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-purple-400 to-pink-400" />
            角色特征
          </h2>
          <div className="flex flex-wrap gap-2">
            {character.traits.map((trait, i) => (
              <span key={i} className="rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-3 py-1 text-xs font-medium text-purple-300 light:text-purple-600 ring-1 ring-purple-500/20">
                {trait.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 描述 */}
      {character.description && (
        <section className="mb-6">
          <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-zinc-200 light:text-zinc-800">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-purple-400 to-pink-400" />
            角色简介
          </h2>
          <div className="rounded-2xl bg-zinc-900/50 light:bg-zinc-100 p-6 ring-1 ring-white/[0.06] light:ring-black/[0.06]">
            <TranslatableDescription text={character.description.replace(/\[.*?\]/g, "").trim()} />
          </div>
        </section>
      )}

      {/* 换一个按钮 */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-6 py-3 text-sm font-medium text-purple-300 light:text-purple-600 ring-1 ring-purple-500/30 transition-all hover:from-purple-500/30 hover:to-pink-500/30 hover:text-purple-200 light:hover:text-purple-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          换一个角色
        </button>
      </div>
    </div>
  )
}