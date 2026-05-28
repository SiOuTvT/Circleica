"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  ChevronDown,
  FileText,
  Globe,
  HardDrive,
  Link2,
  Monitor,
  Plus,
  Trash2,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

/* ─────────── 选项定义 ─────────── */

const PLATFORM_OPTIONS = [
  "Windows",
  "Android",
  "iOS",
  "MacOS",
  "Linux",
  "其他",
]

const LANGUAGE_OPTIONS = [
  "简体中文",
  "繁体中文",
  "日文",
  "英文",
  "韩文",
  "其他",
]

const RUNTYPE_OPTIONS = [
  "电脑硬盘",
  "手机模拟器",
  "安卓直装",
  "苹果直装",
  "原版镜像",
  "其他",
]

const RESOURCE_CONTENT_OPTIONS = [
  "游戏本体",
  "补丁资源",
  "番外资源",
  "游戏存档",
  "其他",
]

/* ─────────── 必填标记 ─────────── */

function RequiredMark() {
  return <span className="text-red-500 ml-0.5">*</span>
}

/* ─────────── 浮动 Popover 单选组件 ─────────── */

function PopoverSelect({ label, icon, options, value, onChange }: {
  label: string
  icon: React.ReactNode
  options: string[]
  value: string[]
  onChange: (val: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggle = useCallback(() => {
    setOpen(prev => !prev)
  }, [])

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handleClick)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-all",
          "border border-foreground/15 bg-card hover:bg-muted",
          value ? "text-foreground" : "text-foreground/60"
        )}
      >
        <span className="flex-shrink-0 opacity-80">{icon}</span>
        <span className="flex-1 text-left truncate">
          {value.length > 0 ? value.join("、") : label}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 flex-shrink-0 opacity-60 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 bottom-full mb-1 z-50 animate-in fade-in-0 zoom-in-95"
        >
          <div className="rounded-xl border border-foreground/15 bg-card shadow-xl overflow-hidden max-h-56 overflow-y-auto">
            {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (value.includes(opt)) {
                      onChange(value.filter(v => v !== opt))
                    } else {
                      onChange([...value, opt])
                    }
                    // 多选不自动关闭，用户可继续选择或点外部关闭
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm transition-all flex items-center gap-2",
                    "hover:bg-muted",
                    value.includes(opt)
                      ? "text-primary bg-primary/10 font-medium"
                      : "text-foreground"
                  )}
                >
                  <span className={cn(
                    "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                    value.includes(opt)
                      ? "bg-primary border-primary"
                      : "border-foreground/30"
                  )}>
                    {value.includes(opt) && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {opt}
                </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────── 资源链接条目数据结构 ─────────── */

interface ResourceEntry {
  id: string
  url: string
  extractCode: string
  decompressCode: string
  fileSize: string
}

function createEmptyEntry(): ResourceEntry {
  return {
    id: Math.random().toString(36).slice(2, 9),
    url: "",
    extractCode: "",
    decompressCode: "",
    fileSize: "",
  }
}

/* ─────────── 主组件 ─────────── */

export function AddResourceDialog() {
  const [open, setOpen] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // 资源链接列表
  const [entries, setEntries] = useState<ResourceEntry[]>([createEmptyEntry()])

  // 详情选择（多选）
  const [platform, setPlatform] = useState<string[]>([])
  const [language, setLanguage] = useState<string[]>([])
  const [runType, setRunType] = useState<string[]>([])
  const [resourceContent, setResourceContent] = useState<string[]>([])

  // 资源名称 & 备注（可选）
  const [resourceName, setResourceName] = useState("")
  const [resourceNote, setResourceNote] = useState("")

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, createEmptyEntry()])
  }, [])

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((e) => e.id !== id)
    })
  }, [])

  const updateEntry = useCallback((id: string, field: keyof ResourceEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    )
  }, [])

  const handleReset = useCallback(() => {
    setEntries([createEmptyEntry()])
    setPlatform([])
    setLanguage([])
    setRunType([])
    setResourceContent([])
    setResourceName("")
    setResourceNote("")
    setSubmitAttempted(false)
  }, [])

  // 检查必填项是否都已填写
  const isValid = useCallback(() => {
    const hasUrl = entries.every((e) => e.url.trim() !== "")
    const hasSelections = platform.length > 0 && language.length > 0 && runType.length > 0 && resourceContent.length > 0
    return hasUrl && hasSelections
  }, [entries, platform, language, runType, resourceContent])

  const handleSubmit = useCallback(() => {
    setSubmitAttempted(true)
    if (!isValid()) return
    // TODO: 提交逻辑
    console.log({
      entries,
      platform,
      language,
      runType,
      resourceContent,
      resourceName,
      resourceNote,
    })
    setOpen(false)
    handleReset()
  }, [entries, platform, language, runType, resourceContent, resourceName, resourceNote, handleReset, isValid])

  const canSubmit = isValid()

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset() }}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold",
            "bg-primary/10 text-primary hover:bg-primary/20",
            "transition-colors"
          )}
        >
          <Plus className="w-4 h-4" />
          添加资源
        </button>
      </DialogTrigger>

      <DialogContent
        showCloseButton
        className={cn(
          "w-[90vw] !max-w-[1152px] max-h-[90vh] overflow-y-auto p-0",
          "rounded-3xl"
        )}
      >
        <DialogHeader className="px-10 pt-10 pb-5">
          <DialogTitle className="text-xl text-foreground">添加资源</DialogTitle>
        </DialogHeader>

        <div className="px-10 pb-10 space-y-8">
          {/* ════════ 资源链接区 ════════ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                资源链接 <RequiredMark />
              </span>
              <button
                type="button"
                onClick={addEntry}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                继续添加链接
              </button>
            </div>

            {entries.map((entry) => (
              <div
                key={entry.id}
                className="space-y-2 rounded-xl border border-foreground/15 bg-muted/30 p-4 relative"
              >
                {/* 删除按钮 */}
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* 链接（独占一行） */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-foreground/80 mb-1.5">
                    <Link2 className="w-3 h-3 opacity-80" />
                    下载地址 <RequiredMark />
                  </label>
                  <input
                    type="url"
                    placeholder="粘贴下载链接，如 https://pan.baidu.com/..."
                    value={entry.url}
                    onChange={(e) => updateEntry(entry.id, "url", e.target.value)}
                    className={cn(
                      "w-full rounded-lg border bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all",
                      submitAttempted && !entry.url.trim() ? "border-red-400" : "border-foreground/15"
                    )}
                  />
                </div>

                {/* 提取码 + 解压码（一行两列） */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-foreground/80 mb-1 block">
                      提取码（没有可不填）
                    </label>
                    <input
                      type="text"
                      placeholder="如 abcd"
                      value={entry.extractCode}
                      onChange={(e) => updateEntry(entry.id, "extractCode", e.target.value)}
                      className="w-full rounded-lg border border-foreground/15 bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-foreground/80 mb-1 block">
                      解压码（没有可不填）
                    </label>
                    <input
                      type="text"
                      placeholder="如 1234"
                      value={entry.decompressCode}
                      onChange={(e) => updateEntry(entry.id, "decompressCode", e.target.value)}
                      className="w-full rounded-lg border border-foreground/15 bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    />
                  </div>
                </div>

                {/* 资源大小（占半行，右侧留白） */}
                <div className="w-1/2">
                  <label className="text-xs text-foreground/80 mb-1 block">
                    资源大小（MB或GB）
                  </label>
                  <input
                    type="text"
                    placeholder="如 2.5GB"
                    value={entry.fileSize}
                    onChange={(e) => updateEntry(entry.id, "fileSize", e.target.value)}
                    className="w-full rounded-lg border border-foreground/15 bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ════════ 详情区 ════════ */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              资源详情 <RequiredMark />
            </span>

            {/* 第一行：资源 + 语言 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground/80 mb-1.5 block">
                  平台 <RequiredMark />
                </label>
                <PopoverSelect
                  label="选择运行平台"
                  icon={<Monitor className="w-4 h-4" />}
                  options={PLATFORM_OPTIONS}
                  value={platform}
                  onChange={setPlatform}
                />
              </div>
              <div>
                <label className="text-xs text-foreground/80 mb-1.5 block">
                  语言 <RequiredMark />
                </label>
                <PopoverSelect
                  label="选择游戏语言"
                  icon={<Globe className="w-4 h-4" />}
                  options={LANGUAGE_OPTIONS}
                  value={language}
                  onChange={setLanguage}
                />
              </div>
            </div>

            {/* 提示文字 */}
            {submitAttempted && (platform.length === 0 || language.length === 0) && (
              <p className="text-xs text-red-500">请填写上方的资源和语言</p>
            )}

            {/* 第二行：运行方式 + 资源内容（向上展开） */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground/80 mb-1.5 block">
                  运行方式 <RequiredMark />
                </label>
                <PopoverSelect
                  label="选择运行方式"
                  icon={<HardDrive className="w-4 h-4" />}
                  options={RUNTYPE_OPTIONS}
                  value={runType}
                  onChange={setRunType}
                />
              </div>
              <div>
                <label className="text-xs text-foreground/80 mb-1.5 block">
                  资源内容 <RequiredMark />
                </label>
                <PopoverSelect
                  label="选择资源类型"
                  icon={<FileText className="w-4 h-4" />}
                  options={RESOURCE_CONTENT_OPTIONS}
                  value={resourceContent}
                  onChange={setResourceContent}
                />
              </div>
            </div>

            {submitAttempted && (runType.length === 0 || resourceContent.length === 0) && (
              <p className="text-xs text-red-500">请填写运行方式和资源内容</p>
            )}
          </div>

          {/* ════════ 可选信息 ════════ */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              补充信息（可选，不填也能提交）
            </span>
            <div>
              <label className="text-xs text-foreground/80 mb-1 block">
                平台名称
              </label>
              <input
                type="text"
                placeholder="如: Steam、DLsite、百度网盘等"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                className="w-full rounded-lg border border-foreground/15 bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-foreground/80 mb-1 block">
                资源备注
              </label>
              <input
                type="text"
                placeholder="比如：包含全CG存档、已测试可运行等"
                value={resourceNote}
                onChange={(e) => setResourceNote(e.target.value)}
                className="w-full rounded-lg border border-foreground/15 bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
          </div>

          {/* ════════ 提交按钮 ════════ */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={false}
            className={cn(
              "w-full rounded-xl py-3.5 text-sm font-semibold transition-all",
              canSubmit
                ? "text-primary-foreground bg-primary hover:opacity-90 active:scale-[0.98]"
                : "text-primary-foreground/70 bg-primary/50 hover:bg-primary/60 active:scale-[0.98]"
            )}
          >
            {canSubmit ? "提交资源" : "请填写所有必填项后提交"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}