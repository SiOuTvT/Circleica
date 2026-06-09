"use client"

import { ImageUpload } from "@/components/image-upload"
import { useAutoSaveDraft } from "@/hooks/use-auto-save-draft"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { Loader2, Plus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { memo, useEffect, useRef, useState } from "react"

import { DESCRIPTION_LANGUAGES, parseDescription, serializeDescription, type LangKey } from "@/lib/parse-description"

interface Tag { id: string; name: string; color: string; groupId?: string | null }
interface TagGroup { id: string; name: string; color: string; tags: Tag[] }

interface Props {
  tags: Tag[]
  tagGroups?: TagGroup[]
  gameId?: string
  initialData?: {
    title: string; originalWork: string; description: string
    coverImage: string; screenshots: string[]
    status: string; isNsfw: boolean; vndbId: string; isPublished: boolean
    tagIds: string[]
    releaseDate?: string; gameDuration?: string; studioName?: string
    englishName?: string; aliases?: string
  }
}

/** 截图项组件（memo 避免上传时全部重渲染导致闪屏） */
const ScreenshotItem = memo(function ScreenshotItem({
  src, index: _index, onUpdate, onRemove,
}: {
  src: string
  index: number
  onUpdate: (url: string) => void
  onRemove: () => void
}) {
  return (
    <div className="group relative">
      <ImageUpload
        value={src}
        onChange={(url: string) => {
          if (!url) {
            onRemove()
          } else {
            onUpdate(url)
          }
        }}
        aspectRatio={16 / 10}
        maxSizeMB={5}
        placeholder="上传截图"
      />
    </div>
  )
})

export function GameForm({ tags: initialTags, tagGroups: initialTagGroups = [], gameId, initialData }: Props) {
  const router = useRouter()
  const isEdit = !!gameId

  // 标签列表（可被 VNDB 拉取动态扩展）
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [tagGroups] = useState<TagGroup[]>(initialTagGroups)

  const [title, setTitle]               = useState(initialData?.title ?? "")
  const handleTitleChange = (v: string) => { setTitle(v); setFormTouched(true) }
  const [originalWork, setOriginalWork] = useState(initialData?.originalWork ?? "")
  // 多语言简介
  const parsedInitialDesc = parseDescription(initialData?.description ?? "")
  const [descLangs, setDescLangs] = useState(parsedInitialDesc)
  const [activeDescLang, setActiveDescLang] = useState<LangKey>("zh")
  function setDescLang(lang: LangKey, val: string) {
    setDescLangs(prev => ({ ...prev, [lang]: val }))
  }
  const [coverImage, setCoverImage]     = useState(initialData?.coverImage ?? "")
  const [screenshots, setScreenshots]  = useState<string[]>(initialData?.screenshots ?? [])
  const [isNsfw, setIsNsfw]            = useState(initialData?.isNsfw ?? false)
  const [vndbId, setVndbId]            = useState(initialData?.vndbId ?? "")
  const [isPublished, setIsPublished]  = useState(initialData?.isPublished ?? true)
  const [selectedTags, setSelectedTags]= useState<string[]>(initialData?.tagIds ?? [])

  // 新增字段
  const [releaseDate, setReleaseDate] = useState(initialData?.releaseDate ?? "")
  const [gameDuration, setGameDuration] = useState(initialData?.gameDuration ?? "")
  const [studioName, setStudioName] = useState(initialData?.studioName ?? "")
  const [englishName, setEnglishName] = useState(initialData?.englishName ?? "")
  const [aliases, setAliases] = useState(initialData?.aliases ?? "")

  // 创作者（VNDB 拉取或手动添加）
  const [creators, setCreators] = useState<Array<{ vndbId: string; name: string; nameJa: string; role: string }>>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (initialData as any)?.creators ?? []
  )

  // 标签搜索
  const [tagSearch, setTagSearch] = useState("")

  // VNDB 拉取
  const [vndbLoading, setVndbLoading] = useState(false)
  const [vndbError, setVndbError] = useState("")
  const [vndbSuccess, setVndbSuccess] = useState("")
  const vndbInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // ── 自动保存草稿（仅新增模式） ──
  const { draft, updateDraft, hasRestored, clearDraft } = useAutoSaveDraft({
    key: "game-form",
    defaultValue: {
      title: "", originalWork: "", englishName: "", aliases: "",
      descLangs: { zh: "", en: "", ja: "", other: "" },
      vndbId: "", releaseDate: "", studioName: "", gameDuration: "",
      isNsfw: false, isPublished: true, selectedTags: [] as string[],
    },
    enabled: !isEdit,
  })

  // 同步表单状态到草稿（防抖保存到 localStorage）
  useEffect(() => {
    if (isEdit) return
    updateDraft({
      title, originalWork, englishName, aliases,
      descLangs, vndbId, releaseDate, studioName, gameDuration,
      isNsfw, isPublished, selectedTags,
    })
  }, [isEdit, title, originalWork, englishName, aliases, descLangs, vndbId, releaseDate, studioName, gameDuration, isNsfw, isPublished, selectedTags, updateDraft])

  // 从草稿恢复表单
  function restoreDraft() {
    setTitle(draft.title)
    setOriginalWork(draft.originalWork)
    setEnglishName(draft.englishName)
    setAliases(draft.aliases)
    setDescLangs(draft.descLangs)
    setVndbId(draft.vndbId)
    setReleaseDate(draft.releaseDate)
    setStudioName(draft.studioName)
    setGameDuration(draft.gameDuration)
    setIsNsfw(draft.isNsfw)
    setIsPublished(draft.isPublished)
    setSelectedTags(draft.selectedTags)
    setDraftRestored(true)
  }

  const [draftRestored, setDraftRestored] = useState(false)
  const showDraftBanner = !isEdit && hasRestored && !draftRestored

  // 表单修改保护：编辑模式下始终保护，新增模式下有内容时保护
  const [formTouched, setFormTouched] = useState(false)
  useUnsavedChanges(isEdit || formTouched)

  // 翻译状态
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState("")
  const [translateSuccess, setTranslateSuccess] = useState("")

  /** 翻译当前 Tab 内容到指定目标语种 */
  async function handleTranslate(targetLang: "zh" | "ja" | "en") {
    const sourceText = descLangs[activeDescLang]
    if (!sourceText.trim()) { setTranslateError("当前语种没有内容可翻译"); return }
    // activeDescLang 不可能是 targetLang（外层已过滤），无需重复检查

    const fromLang = activeDescLang === "en" ? "en" : activeDescLang === "ja" ? "ja" : "auto"
    const toLang = targetLang === "zh" ? "zh-CN" : targetLang === "en" ? "en" : "ja"
    const targetLabel = targetLang === "zh" ? "中文" : targetLang === "en" ? "英文" : "日文"

    setTranslating(true)
    setTranslateError("")
    setTranslateSuccess("")

    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText, from: fromLang, to: toLang }),
      })
      const data = await res.json()
      if (!res.ok) { setTranslateError(data.error || "翻译失败"); return }

      setDescLangs(prev => {
        const existing = prev[targetLang]?.trim()
        const newContent = existing ? `${existing}\n\n${data.translatedText}` : data.translatedText
        return { ...prev, [targetLang]: newContent }
      })
      setTranslateSuccess(`已将${DESCRIPTION_LANGUAGES.find(l => l.key === activeDescLang)?.label}翻译为${targetLabel}并填入${targetLabel} Tab，可手动修改。`)
    } catch (err) {
      setTranslateError(`翻译出错: ${(err as Error).message}`)
    } finally {
      setTranslating(false)
    }
  }

  /** 一键翻译到另外两种语言（英文 Tab → 中+日；中文 Tab → 英+日） */
  async function handleTranslateToBoth() {
    const sourceText = descLangs[activeDescLang]
    if (!sourceText.trim()) { setTranslateError("当前语种没有内容可翻译"); return }

    const fromLang = activeDescLang === "en" ? "en" : activeDescLang === "ja" ? "ja" : "auto"
    // 确定两个目标语种
    const targets: { lang: "zh" | "ja" | "en"; to: string; label: string }[] = activeDescLang === "zh"
      ? [{ lang: "en", to: "en", label: "英文" }, { lang: "ja", to: "ja", label: "日文" }]
      : activeDescLang === "en"
        ? [{ lang: "zh", to: "zh-CN", label: "中文" }, { lang: "ja", to: "ja", label: "日文" }]
        : [{ lang: "zh", to: "zh-CN", label: "中文" }, { lang: "en", to: "en", label: "英文" }]
    setTranslating(true)
    setTranslateError("")
    setTranslateSuccess("")

    try {
      // 并行请求两个目标语种翻译
      const [res1, res2] = await Promise.all(
        targets.map(t =>
          fetch("/api/admin/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: sourceText, from: fromLang, to: t.to }),
          })
        )
      )

      const data1 = await res1.json()
      const data2 = await res2.json()

      const errors: string[] = []
      if (!res1.ok) errors.push(`${targets[0].label}翻译失败: ${data1.error || "未知错误"}`)
      if (!res2.ok) errors.push(`${targets[1].label}翻译失败: ${data2.error || "未知错误"}`)
      if (errors.length > 0) { setTranslateError(errors.join("；")); return }

      setDescLangs(prev => {
        const result = { ...prev }
        const d1 = prev[targets[0].lang]?.trim()
        const d2 = prev[targets[1].lang]?.trim()
        result[targets[0].lang] = d1 ? `${d1}\n\n${data1.translatedText}` : data1.translatedText
        result[targets[1].lang] = d2 ? `${d2}\n\n${data2.translatedText}` : data2.translatedText
        return result
      })

      const parts: string[] = []
      if (data1.translatedText) parts.push(targets[0].label)
      if (data2.translatedText) parts.push(targets[1].label)
      setTranslateSuccess(`已将${DESCRIPTION_LANGUAGES.find(l => l.key === activeDescLang)?.label}简介翻译为${parts.join("和")}并填入对应 Tab，可手动修改。`)
    } catch (err) {
      setTranslateError(`翻译出错: ${(err as Error).message}`)
    } finally {
      setTranslating(false)
    }
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])
  }

  /* ── VNDB 一键拉取 ── */
  async function handleVndbFetch() {
    const id = vndbInputRef.current?.value?.trim()
    if (!id) { setVndbError("请输入 VNDB 编号"); return }

    setVndbLoading(true)
    setVndbError("")
    setVndbSuccess("")

    try {
      const res = await fetch("/api/admin/vndb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vndbId: id }),
      })
      const data = await res.json()
      if (!res.ok) { setVndbError(data.error ?? "拉取失败"); return }

      // 自动填充字段（所有字段均可手动修改）
      if (data.title) setTitle(data.title)
      if (data.japaneseName) setOriginalWork(data.japaneseName)
      if (data.englishName) setEnglishName(data.englishName)
      if (data.aliases) setAliases(data.aliases)
      if (data.description) setDescLangs(prev => ({ ...prev, en: data.description }))
      if (data.studioName) setStudioName(data.studioName)

      // 发售日期
      if (data.releaseDate) {
        // VNDB 返回格式可能是 "2023-04-28" 或 "2023-04" 或 null
        const dateStr = data.releaseDate.substring(0, 10)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          setReleaseDate(dateStr)
        }
      }

      // 标签：合并到已有标签列表 + 选中
      if (data.tagIds?.length) {
        setSelectedTags(prev => {
          const merged = new Set([...prev, ...data.tagIds])
          return Array.from(merged)
        })

        // 如果 VNDB 返回了新标签信息，添加到本地标签列表
        if (data.tagNames?.length) {
          setTags(prev => {
            const existingIds = new Set(prev.map(t => t.id))
            const newOnes = data.tagNames
              .filter((t: { id: string }) => !existingIds.has(t.id))
              .map((t: { id: string; name: string }) => ({
                id: t.id,
                name: t.name,
                color: "#6b7280",
                groupId: null as string | null,
              }))
            return [...prev, ...newOnes]
          })
        }
      }

      // 创作者（脚本、原画、音乐等）
      if (data.creators?.length) {
        setCreators(data.creators)
      }

      // 同步更新 VNDB ID
      setVndbId(id)
      setVndbSuccess("VNDB 数据拉取成功！所有字段均可手动修改。")

    } catch (err) {
      setVndbError(`拉取出错: ${(err as Error).message}`)
    } finally {
      setVndbLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    const body = {
      title, originalWork, description: serializeDescription(descLangs), coverImage,
      screenshots: screenshots.filter(Boolean),
      downloadLinks: [],
      isNsfw, vndbId, isPublished,
      tagIds: selectedTags,
      resourceTags: [], // 后台表单不直接编辑资源标签，由前台资源链接管理
      releaseDate: releaseDate || null,
      gameDuration,
      studioName,
      englishName,
      aliases,
      creators: creators.length ? creators : undefined,
    }

    const res = await fetch(
      isEdit ? `/api/admin/games/${gameId}` : "/api/admin/games",
      { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    )
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error ?? "保存失败"); return }
    clearDraft()
    router.push("/admin/games")
    router.refresh()
  }

  const inputCls = "w-full rounded-xl bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
  const labelCls = "mb-2 block text-sm font-medium text-foreground"



  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">{error}</div>
      )}

      {/* 草稿恢复提示 */}
      {showDraftBanner && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400 ring-1 ring-amber-500/20">
          <span>检测到未保存的草稿「{draft.title || "无标题"}」，是否恢复？</span>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={restoreDraft}
              className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors">
              恢复
            </button>
            <button type="button" onClick={() => { clearDraft(); setDraftRestored(true) }}
              className="rounded-lg px-3 py-1 text-xs font-medium text-amber-400/60 hover:text-amber-300 transition-colors">
              丢弃
            </button>
          </div>
        </div>
      )}

      {/* ── VNDB 一键拉取 ── */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-3">
        <h2 className="text-base font-semibold text-foreground">VNDB 数据拉取</h2>
        <p className="text-xs text-muted-foreground">输入 VNDB 编号，一键拉取游戏数据自动填充表单。所有拉取的字段均可手动修改。</p>
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <div className="flex gap-2">
              <input
                ref={vndbInputRef}
                defaultValue={vndbId}
                placeholder="输入 VNDB 编号，如：v12345 或 12345"
                className={inputCls}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleVndbFetch() } }}
              />
              <button
                type="button"
                onClick={handleVndbFetch}
                disabled={vndbLoading}
                className="shrink-0 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 disabled:opacity-60"
              >
                {vndbLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" /></svg>
                )}
                {vndbLoading ? "拉取中…" : "一键拉取"}
              </button>
            </div>
          </div>
        </div>
        {vndbError && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 ring-1 ring-red-500/20">{vndbError}</div>
        )}
        {vndbSuccess && (
          <div className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 ring-1 ring-emerald-500/20">{vndbSuccess}</div>
        )}
      </div>

      {/* 游戏信息 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4">
        <h2 className="text-base font-semibold text-foreground">游戏信息</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>主推名称（前台卡片展示） *</label>
            <input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="前台首页唯一展示的游戏名称" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>日文官方原名</label>
            <input value={originalWork} onChange={(e) => setOriginalWork(e.target.value)} placeholder="日文原名" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>英文官方名称</label>
            <input value={englishName} onChange={(e) => setEnglishName(e.target.value)} placeholder="英文名称" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>搜索别名（逗号分隔）</label>
            <input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="民间别称、其他语言名称…" className={inputCls} />
          </div>
        </div>
        {/* 多语言简介 Tab 切换 */}
        <div>
          <label className={labelCls}>简介</label>
          <div className="flex gap-1.5 mb-2 overflow-x-auto">
            {DESCRIPTION_LANGUAGES.map(({ key, label, flag }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveDescLang(key)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                  activeDescLang === key
                    ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <span>{flag}</span>
                <span>{label}</span>
                {descLangs[key] && (
                  <span className="ml-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>
            ))}
          </div>
          {DESCRIPTION_LANGUAGES.map(({ key, label }) => (
            activeDescLang === key && (
              <textarea
                key={key}
                value={descLangs[key]}
                onChange={(e) => setDescLang(key, e.target.value)}
                placeholder={`输入${label}…`}
                rows={4}
                className={`${inputCls} resize-none`}
              />
            )
          ))}
          {/* 翻译按钮 — 所有语言 Tab 均显示 */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* 翻译到中文（非 zh Tab 时显示） */}
            {activeDescLang !== "zh" && (
              <button
                type="button"
                onClick={() => handleTranslate("zh")}
                disabled={translating || !descLangs[activeDescLang].trim()}
                className="flex items-center gap-2 rounded-lg bg-amber-500/10 text-amber-500 px-4 py-2 text-xs font-medium ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {translating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" />
                    <path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
                  </svg>
                )}
                {translating ? "翻译中…" : "翻译为中文"}
              </button>
            )}
            {/* 翻译到英文（zh Tab 时显示） */}
            {activeDescLang === "zh" && (
              <button
                type="button"
                onClick={() => handleTranslate("en")}
                disabled={translating || !descLangs.zh.trim()}
                className="flex items-center gap-2 rounded-lg bg-sky-500/10 text-sky-500 px-4 py-2 text-xs font-medium ring-1 ring-sky-500/20 hover:bg-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {translating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" />
                    <path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
                  </svg>
                )}
                {translating ? "翻译中…" : "翻译为英文"}
              </button>
            )}
            {/* 翻译到日文（非 ja Tab 时显示） */}
            {activeDescLang !== "ja" && (
              <button
                type="button"
                onClick={() => handleTranslate("ja")}
                disabled={translating || !descLangs[activeDescLang].trim()}
                className="flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-4 py-2 text-xs font-medium ring-1 ring-primary/20 hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {translating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" />
                    <path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
                  </svg>
                )}
                {translating ? "翻译中…" : "翻译为日文"}
              </button>
            )}
            {/* 一键双语翻译（英文 Tab 显示，翻译为中+日） */}
            {activeDescLang === "en" && (
              <button
                type="button"
                onClick={handleTranslateToBoth}
                disabled={translating || !descLangs.en.trim()}
                className="flex items-center gap-2 rounded-lg bg-emerald-500/10 text-emerald-500 px-4 py-2 text-xs font-semibold ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {translating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M2 12h20" /><circle cx="12" cy="12" r="10" />
                  </svg>
                )}
                {translating ? "翻译中…" : "一键翻译为中+日"}
              </button>
            )}
            {/* 一键双语翻译（中文 Tab 显示，翻译为英+日） */}
            {activeDescLang === "zh" && (
              <button
                type="button"
                onClick={handleTranslateToBoth}
                disabled={translating || !descLangs.zh.trim()}
                className="flex items-center gap-2 rounded-lg bg-emerald-500/10 text-emerald-500 px-4 py-2 text-xs font-semibold ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {translating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M2 12h20" /><circle cx="12" cy="12" r="10" />
                  </svg>
                )}
                {translating ? "翻译中…" : "一键翻译为英+日"}
              </button>
            )}
            {/* 一键双语翻译（日文 Tab 显示，翻译为中+英） */}
            {activeDescLang === "ja" && (
              <button
                type="button"
                onClick={handleTranslateToBoth}
                disabled={translating || !descLangs.ja.trim()}
                className="flex items-center gap-2 rounded-lg bg-emerald-500/10 text-emerald-500 px-4 py-2 text-xs font-semibold ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {translating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M2 12h20" /><circle cx="12" cy="12" r="10" />
                  </svg>
                )}
                {translating ? "翻译中…" : "一键翻译为中+英"}
              </button>
            )}
          </div>
          {translateError && (
            <div className="mt-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 ring-1 ring-red-500/20">{translateError}</div>
          )}
          {translateSuccess && (
            <div className="mt-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 ring-1 ring-emerald-500/20">{translateSuccess}</div>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground/50">
            前台默认优先展示中文，缺少的语种将按{"中文 > 英文 > 日文 > 其他"}的优先级自动回退。
            {activeDescLang === "en" && " VNDB 拉取的英文简介将自动填入此栏，可点击翻译按钮一键生成中文。"}
          </p>
        </div>
      </div>

      {/* 发布设置 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4">
        <h2 className="text-base font-semibold text-foreground">发布设置</h2>
        <div className="flex gap-5">
          <div className="shrink-0">
            <label className={labelCls}>封面图</label>
            <ImageUpload
              value={coverImage}
              onChange={(url) => setCoverImage(url)}
              aspectRatio={3 / 2}
              maxSizeMB={5}
              placeholder="上传封面"
              className="w-[200px] sm:w-[240px]"
            />
          </div>
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>VNDB ID</label>
                <input value={vndbId} onChange={(e) => setVndbId(e.target.value)} placeholder="如：12345" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>发售日期</label>
                <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>制作会社</label>
                <input value={studioName} onChange={(e) => setStudioName(e.target.value)} placeholder="如：Key" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>游戏时长</label>
                <input value={gameDuration} onChange={(e) => setGameDuration(e.target.value)} placeholder="如：20-30小时" className={inputCls} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-2 border-t border-border">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={isNsfw} onChange={(e) => setIsNsfw(e.target.checked)} className="h-4 w-4 rounded accent-primary" />
                NSFW 内容
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 rounded accent-primary" />
                立即发布
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 标签 — 带搜索和复选框，按标签组分类 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border">
        <h2 className="mb-3 text-base font-semibold text-foreground">标签</h2>
        {/* 搜索框 */}
        <div className="mb-3">
          <input
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            placeholder="搜索标签…"
            className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border outline-none focus:ring-ring transition-all"
          />
        </div>
        {/* 已选标签展示 */}
        {selectedTags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {selectedTags.map(id => {
              const tag = tags.find(t => t.id === id)
              if (!tag) return null
              return (
                <span key={id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ color: tag.color, background: `${tag.color}18` }}>
                  {tag.name}
                  <button type="button" onClick={() => toggleTag(id)}
                    className="hover:text-red-400 transition-colors cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })}
          </div>
        )}
        {/* 按标签组分类显示 */}
        <div className="max-h-72 overflow-y-auto space-y-3 rounded-lg bg-secondary/50 p-3">
          {(() => {
            const searchLower = tagSearch.toLowerCase()
            // 已分组的标签
            const grouped = tagGroups
              .map(g => ({
                ...g,
                tags: g.tags.filter(t => !searchLower || t.name.toLowerCase().includes(searchLower)),
              }))
              .filter(g => g.tags.length > 0)
            // 未分组的标签
            const ungrouped = tags.filter(t => {
              const inGroup = tagGroups.some(g => g.tags.some(gt => gt.id === t.id))
              const matchesSearch = !searchLower || t.name.toLowerCase().includes(searchLower)
              return !inGroup && matchesSearch
            })

            if (grouped.length === 0 && ungrouped.length === 0) {
              return <p className="px-3 py-2 text-xs text-muted-foreground">没有匹配的标签</p>
            }

            return (
              <>
                {grouped.map(group => (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <div className="h-2 w-2 rounded-full" style={{ background: group.color }} />
                      <span className="text-xs font-semibold text-muted-foreground">{group.name}</span>
                    </div>
                    <div className="space-y-0.5 pl-1">
                      {group.tags.map((tag) => {
                        const checked = selectedTags.includes(tag.id)
                        return (
                          <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                              checked ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                            }`}>
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-colors ${
                              checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                            }`}>
                              {checked && "✓"}
                            </span>
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: tag.color }} />
                            {tag.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {ungrouped.length > 0 && (
                  <div>
                    {grouped.length > 0 && (
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                        <span className="text-xs font-semibold text-muted-foreground">未分组</span>
                      </div>
                    )}
                    <div className="space-y-0.5 pl-1">
                      {ungrouped.map((tag) => {
                        const checked = selectedTags.includes(tag.id)
                        return (
                          <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                              checked ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                            }`}>
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-colors ${
                              checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                            }`}>
                              {checked && "✓"}
                            </span>
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: tag.color }} />
                            {tag.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
        {tags.length === 0 && <p className="mt-2 text-xs text-muted-foreground">暂无标签，请先在标签管理中创建</p>}
      </div>

      {/* 创作者 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-3">
        <h2 className="text-base font-semibold text-foreground">创作者</h2>
        <p className="text-xs text-muted-foreground">VNDB 拉取时自动填充，也可手动管理</p>
        {creators.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {creators.map((c, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-1.5 ring-1 ring-border text-xs"
              >
                <span className="font-medium text-foreground">{c.name}</span>
                {c.nameJa && <span className="text-muted-foreground">({c.nameJa})</span>}
                <span className="text-[10px] text-muted-foreground bg-muted rounded px-1 py-0.5">{c.role}</span>
                <button
                  type="button"
                  onClick={() => setCreators(p => p.filter((_, idx) => idx !== i))}
                  className="ml-1 text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60">暂无创作者，使用 VNDB 拉取时会自动填入</p>
        )}
      </div>

      {/* 截图 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-3">
        <h2 className="text-base font-semibold text-foreground">截图</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {screenshots.map((src, i) => (
            <ScreenshotItem
              key={`screenshot-${i}-${src.slice(-8)}`}
              src={src}
              index={i}
              onUpdate={(url) => {
                setScreenshots((p) => p.map((s, idx) => idx === i ? url : s))
              }}
              onRemove={() => {
                setScreenshots((p) => p.filter((_, idx) => idx !== i))
              }}
            />
          ))}
        </div>
        <button type="button" onClick={() => setScreenshots((p) => [...p, ""])}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />添加截图
        </button>
      </div>

      {/* 提交 */}
      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
          {saving ? "保存中…" : isEdit ? "保存修改" : "创建游戏"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="rounded-xl bg-secondary px-6 py-2.5 text-sm text-muted-foreground ring-1 ring-border transition-all duration-200 hover:text-foreground">
          取消
        </button>
      </div>
    </form>
  )
}