"use client"

import { ImageUpload } from "@/components/image-upload";
import { ChevronDown, Loader2, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Tag { id: string; name: string; color: string }
interface DownloadLink { label: string; url: string }
interface FileSizeEntry { value: string; unit: "MB" | "GB" }

const LANGUAGE_OPTIONS = ["简体中文", "繁体中文", "日文", "英文", "韩文", "其他"]
const PLATFORM_OPTIONS = ["PC", "安卓直装", "模拟器", "Linux", "MacOS", "网页版"]

interface Props {
  tags: Tag[]
  gameId?: string
  initialData?: {
    title: string; originalWork: string; description: string
    coverImage: string; screenshots: string[]; downloadLinks: DownloadLink[]
    status: string; isNsfw: boolean; vndbId: string; isPublished: boolean
    tagIds: string[]
    platform: string; language: string; fileSize: string
  }
}

/* 解析旧的纯文本格式为数组 */
function parseStringArray(raw: string): string[] {
  if (!raw) return []
  try { const p = JSON.parse(raw); if (Array.isArray(p)) return p } catch {}
  return raw.split(/[,，/、]/).map(s => s.trim()).filter(Boolean)
}

function parseFileSizeArray(raw: string): FileSizeEntry[] {
  if (!raw) return []
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p.map(e => ({ value: String(e.value ?? ""), unit: (e.unit === "MB" ? "MB" : "GB") as "MB" | "GB" }))
  } catch {}
  // 旧格式兼容: "1.25 GB / 700 MB"
  const parts = raw.split(/[/、,，]/).map(s => s.trim()).filter(Boolean)
  return parts.map(part => {
    const m = part.match(/([\d.]+)\s*(MB|GB)/i)
    if (m) return { value: m[1], unit: (m[2].toUpperCase() as "MB" | "GB") }
    return { value: part, unit: "GB" as const }
  })
}

export function GameForm({ tags, gameId, initialData }: Props) {
  const router = useRouter()
  const isEdit = !!gameId

  const [title, setTitle]               = useState(initialData?.title ?? "")
  const [originalWork, setOriginalWork] = useState(initialData?.originalWork ?? "")
  const [description, setDescription]  = useState(initialData?.description ?? "")
  const [coverImage, setCoverImage]     = useState(initialData?.coverImage ?? "")
  const [screenshots, setScreenshots]  = useState<string[]>(initialData?.screenshots ?? [])
  const [dlLinks, setDlLinks]          = useState<DownloadLink[]>(initialData?.downloadLinks ?? [{ label: "", url: "" }])
  const [isNsfw, setIsNsfw]            = useState(initialData?.isNsfw ?? false)
  const [vndbId, setVndbId]            = useState(initialData?.vndbId ?? "")
  const [isPublished, setIsPublished]  = useState(initialData?.isPublished ?? true)
  const [selectedTags, setSelectedTags]= useState<string[]>(initialData?.tagIds ?? [])

  // 多选标签：语言 & 平台
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(parseStringArray(initialData?.platform ?? ""))
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(parseStringArray(initialData?.language ?? ""))

  // 文件大小：多行追加
  const [fileSizes, setFileSizes] = useState<FileSizeEntry[]>(parseFileSizeArray(initialData?.fileSize ?? ""))
  const [sizeValue, setSizeValue] = useState("")
  const [sizeUnit, setSizeUnit] = useState<"MB" | "GB">("GB")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function toggleMultiSelect(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])
  }

  function addFileSize() {
    if (!sizeValue.trim()) return
    setFileSizes(prev => [...prev, { value: sizeValue.trim(), unit: sizeUnit }])
    setSizeValue("")
  }

  function removeFileSize(idx: number) {
    setFileSizes(prev => prev.filter((_, i) => i !== idx))
  }

  function updateDl(i: number, field: keyof DownloadLink, val: string) {
    setDlLinks((prev) => prev.map((dl, idx) => idx === i ? { ...dl, [field]: val } : dl))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    const body = {
      title, originalWork, description, coverImage,
      screenshots: screenshots.filter(Boolean),
      downloadLinks: dlLinks.filter((d) => d.url.trim()),
      isNsfw, vndbId, isPublished,
      tagIds: selectedTags,
      platform: JSON.stringify(selectedPlatforms),
      language: JSON.stringify(selectedLanguages),
      fileSize: JSON.stringify(fileSizes),
    }

    const res = await fetch(
      isEdit ? `/api/admin/games/${gameId}` : "/api/admin/games",
      { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    )
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error ?? "保存失败"); return }
    router.push("/admin/games")
    router.refresh()
  }

  const inputCls = "w-full rounded-xl bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border outline-none focus:ring-ring transition-all"
  const labelCls = "mb-1.5 block text-xs font-medium text-muted-foreground"

  /* 通用多选标签渲染器 — 下拉选择控件 */
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  function renderMultiSelect(label: string, options: string[], selected: string[], setSelected: (v: string[]) => void, id: string) {
    const isOpen = openDropdown === id
    return (
      <div className="relative">
        <label className={labelCls}>{label}</label>
        {/* 选择框 */}
        <button
          type="button"
          onClick={() => setOpenDropdown(isOpen ? null : id)}
          className="w-full rounded-xl bg-secondary px-4 py-2.5 text-left text-sm ring-1 ring-border outline-none focus:ring-ring transition-all"
        >
          <div className="flex flex-wrap items-center gap-1.5 min-h-[20px]">
            {selected.length === 0 ? (
              <span className="text-muted-foreground/50">点击选择{label}…</span>
            ) : (
              selected.map(s => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                  {s}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setSelected(selected.filter(v => v !== s)) }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setSelected(selected.filter(v => v !== s)) } }}
                    className="hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </span>
              ))
            )}
            <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {/* 下拉选项 */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
            <div className="absolute z-50 mt-1 w-full rounded-xl bg-popover p-1.5 shadow-xl ring-1 ring-border max-h-60 overflow-y-auto">
              {options.map(opt => {
                const checked = selected.includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleMultiSelect(selected, setSelected, opt)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      checked
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-colors ${
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background"
                    }`}>
                      {checked && "✓"}
                    </span>
                    {opt}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">{error}</div>
      )}

      {/* 基本信息 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4">
        <h2 className="text-sm font-semibold text-foreground">基本信息</h2>

        <div>
          <label className={labelCls}>游戏名称 *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="游戏名称" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>原作</label>
          <input value={originalWork} onChange={(e) => setOriginalWork(e.target.value)} placeholder="如：东方Project" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>简介</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="游戏简介…" rows={4} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={labelCls}>封面图</label>
          <ImageUpload
            value={coverImage}
            onChange={(url) => setCoverImage(url)}
            aspectRatio={4 / 5}
            maxSizeMB={5}
            placeholder="上传游戏封面"
            className="max-w-[200px]"
          />
        </div>
        <div>
          <label className={labelCls}>VNDB ID</label>
          <input value={vndbId} onChange={(e) => setVndbId(e.target.value)} placeholder="如：12345" className={inputCls} />
        </div>
      </div>

      {/* 运行参数 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-5">
        <h2 className="text-sm font-semibold text-foreground">运行参数</h2>

        {renderMultiSelect("平台", PLATFORM_OPTIONS, selectedPlatforms, setSelectedPlatforms, "platform")}
        {renderMultiSelect("语言", LANGUAGE_OPTIONS, selectedLanguages, setSelectedLanguages, "language")}

        {/* 文件大小：多行追加 */}
        <div>
          <label className={labelCls}>文件大小</label>
          {/* 已添加的大小列表 */}
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
            {fileSizes.map((fs, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium transition-all duration-200">
                {fs.value} {fs.unit}
                <button type="button" onClick={() => removeFileSize(i)} className="hover:text-red-400 transition-colors duration-200">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {/* 输入行 */}
          <div className="flex gap-2 items-center">
            <input
              type="number"
              step="any"
              value={sizeValue}
              onChange={e => setSizeValue(e.target.value)}
              placeholder="数值"
              className={`${inputCls} !w-28`}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFileSize() } }}
            />
            <select
              value={sizeUnit}
              onChange={e => setSizeUnit(e.target.value as "MB" | "GB")}
              className={`${inputCls} !w-20`}
            >
              <option value="GB">GB</option>
              <option value="MB">MB</option>
            </select>
            <button type="button" onClick={addFileSize}
              className="shrink-0 flex items-center gap-1 rounded-xl bg-primary/10 text-primary px-4 py-2.5 text-xs font-medium ring-1 ring-primary/20 hover:bg-primary/20 transition-all duration-200">
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />添加
            </button>
          </div>
        </div>
      </div>

      {/* 发布设置 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4">
        <h2 className="text-sm font-semibold text-foreground">发布设置</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={isNsfw} onChange={(e) => setIsNsfw(e.target.checked)} className="h-4 w-4 rounded accent-blue-500" />
            NSFW 内容
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 rounded accent-blue-500" />
            立即发布
          </label>
        </div>
      </div>

      {/* 标签 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border">
        <h2 className="mb-3 text-sm font-semibold text-foreground">标签</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all duration-200 ${selectedTags.includes(tag.id) ? "ring-current" : "ring-transparent opacity-50 hover:opacity-80"}`}
              style={{ color: tag.color, background: `${tag.color}18`, outlineColor: tag.color }}>
              {tag.name}
            </button>
          ))}
          {tags.length === 0 && <p className="text-xs text-muted-foreground">暂无标签，请先在标签管理中创建</p>}
        </div>
      </div>

      {/* 下载链接 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-3">
        <h2 className="text-sm font-semibold text-foreground">下载链接</h2>
        {dlLinks.map((dl, i) => (
          <div key={i} className="flex gap-2">
            <input value={dl.label} onChange={(e) => updateDl(i, "label", e.target.value)} placeholder="标签（如：百度网盘）" className={`${inputCls} w-36 shrink-0`} />
            <input value={dl.url} onChange={(e) => updateDl(i, "url", e.target.value)} placeholder="下载地址 URL" className={inputCls} />
            <button type="button" onClick={() => setDlLinks((p) => p.filter((_, idx) => idx !== i))}
              className="shrink-0 rounded-xl bg-secondary px-2.5 text-muted-foreground ring-1 ring-border hover:text-red-400 transition-colors duration-200">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setDlLinks((p) => [...p, { label: "", url: "" }])}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />添加链接
        </button>
      </div>

      {/* 截图 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-3">
        <h2 className="text-sm font-semibold text-foreground">截图</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {screenshots.map((src, i) => (
            <div key={i} className="group relative">
              <ImageUpload
                value={src}
                onChange={(url) => {
                  if (!url) {
                    setScreenshots((p) => p.filter((_, idx) => idx !== i))
                  } else {
                    setScreenshots((p) => p.map((s, idx) => idx === i ? url : s))
                  }
                }}
                aspectRatio={16 / 9}
                maxSizeMB={5}
                placeholder="上传截图"
              />
            </div>
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
          className="gradient-accent flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-60">
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