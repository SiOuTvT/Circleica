"use client"

import { Loader2, Sparkles, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function RandomCreatorBtn() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function go() {
    setLoading(true)
    try {
      console.log("开始获取随机创作者...")
      // 随机创作者（真人）- 直接从 VNDB 获取
      const res  = await fetch("/api/creators/random", {
        cache: "no-store",
      })
      
      if (!res.ok) {
        console.error("API 请求失败:", res.status, res.statusText)
        const errorData = await res.json().catch(() => ({}))
        throw new Error(`API 请求失败: ${res.status} - ${errorData.error || '未知错误'}`)
      }
      
      const data = await res.json()
      console.log("获取到的数据:", data)
      
      if (data.id) {
        console.log("跳转到创作者页面:", `/creators/${data.id}`)
        router.push(`/creators/${data.id}`)
      } else if (data.error) {
        console.error("API 返回错误:", data.error)
        alert(`获取失败: ${data.error}`)
      } else {
        // 没有创作者，随机游戏
        console.log("没有创作者数据，尝试随机游戏...")
        const res2  = await fetch("/api/games/random", {
          cache: "no-store",
        })
        const data2 = await res2.json()
        if (data2.id) {
          router.push(`/games/${data2.id}`)
        } else {
          alert("暂无可推荐的内容")
        }
      }
    } catch (error) {
      console.error("Random selection error:", error)
      alert(`随机选择失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={go}
      disabled={loading}
      className="flex items-center justify-center gap-2 rounded-xl bg-card/60 px-4 py-3 text-sm text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground disabled:opacity-50 group w-full max-w-[200px]"
      title="随机发现同人创作者（脚本家、画师、音乐人等）"
    >
      {loading
        ? <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2.5} />
        : <User className="h-6 w-6 transition-transform group-hover:scale-110" strokeWidth={2.5} />
      }
      <span className="font-medium">随机创作者</span>
    </button>
  )
}

export function RandomCharacterBtn() {
  const [loading, setLoading] = useState(false)
  const [character, setCharacter] = useState<any>(null)
  const [showDialog, setShowDialog] = useState(false)

  async function fetchCharacter() {
    setLoading(true)
    try {
      console.log("开始获取随机角色...")
      const res = await fetch("/api/characters/random", {
        cache: "no-store",
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(`API 请求失败: ${res.status} - ${errorData.error || '未知错误'}`)
      }
      
      const data = await res.json()
      console.log("获取到的角色数据:", data)
      
      if (data.error) {
        alert(`获取失败: ${data.error}`)
      } else {
        setCharacter(data)
        setShowDialog(true)
      }
    } catch (error) {
      console.error("Random character error:", error)
      alert(`随机角色获取失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  const roleMap: Record<string, string> = {
    main: "主角",
    primary: "主要角色",
    side: "次要角色",
    appears: "出场角色",
  }

  return (
    <>
      <button
        onClick={fetchCharacter}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-xl bg-card/60 px-4 py-3 text-sm text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground disabled:opacity-50 group w-full max-w-[200px]"
        title="随机查看游戏角色（完整角色设定）"
      >
        {loading
          ? <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2.5} />
          : <Sparkles className="h-6 w-6 transition-transform group-hover:scale-110" strokeWidth={2.5} />
        }
        <span className="font-medium">随机角色</span>
      </button>

      {/* 角色详情弹窗 */}
      {showDialog && character && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDialog(false)}>
          <div className="glass-heavy rounded-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            {/* 头部：图片 + 名字 */}
            <div className="flex gap-4 mb-4">
              {character.image && (
                <img 
                  src={character.image} 
                  alt={character.name}
                  className="w-24 h-32 object-cover rounded-lg ring-1 ring-border flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground">{character.name}</h3>
                {character.original && (
                  <p className="text-sm text-muted-foreground">{character.original}</p>
                )}
                {character.role && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                    {roleMap[character.role] || character.role}
                  </span>
                )}
                {character.vnTitle && (
                  <p className="text-xs text-muted-foreground mt-2">
                    出处：{character.vnTitle}
                  </p>
                )}
              </div>
            </div>

            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              {character.gender?.length > 0 && (
                <div className="flex gap-1">
                  <span className="text-muted-foreground">性别:</span>
                  <span className="text-foreground">{character.gender.join(", ")}</span>
                </div>
              )}
              {character.age && (
                <div className="flex gap-1">
                  <span className="text-muted-foreground">年龄:</span>
                  <span className="text-foreground">{character.age}</span>
                </div>
              )}
              {character.birthday && (
                <div className="flex gap-1">
                  <span className="text-muted-foreground">生日:</span>
                  <span className="text-foreground">{character.birthday[0]}月{character.birthday[1]}日</span>
                </div>
              )}
              {character.bloodType && (
                <div className="flex gap-1">
                  <span className="text-muted-foreground">血型:</span>
                  <span className="text-foreground">{character.bloodType}</span>
                </div>
              )}
              {character.height && (
                <div className="flex gap-1">
                  <span className="text-muted-foreground">身高:</span>
                  <span className="text-foreground">{character.height}cm</span>
                </div>
              )}
              {character.weight && (
                <div className="flex gap-1">
                  <span className="text-muted-foreground">体重:</span>
                  <span className="text-foreground">{character.weight}kg</span>
                </div>
              )}
              {character.bust && character.waist && character.hips && (
                <div className="flex gap-1 col-span-2">
                  <span className="text-muted-foreground">三围:</span>
                  <span className="text-foreground">
                    {character.bust}-{character.waist}-{character.hips}
                    {character.cup ? ` (${character.cup})` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* 别名 */}
            {character.aliases?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">别名</p>
                <div className="flex flex-wrap gap-1">
                  {character.aliases.slice(0, 5).map((alias: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 特征 */}
            {character.traits?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1">特征</p>
                <div className="flex flex-wrap gap-1">
                  {character.traits.map((trait: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                      {trait.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 描述 */}
            {character.description && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-1">简介</p>
                <p className="text-sm text-foreground/80 line-clamp-6 leading-relaxed">
                  {character.description.replace(/\[.*?\]/g, "").trim()}
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowDialog(false)}
                className="flex-1 px-4 py-2 text-sm rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  setShowDialog(false)
                  fetchCharacter()
                }}
                className="flex-1 px-4 py-2 text-sm rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                再来一个
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}