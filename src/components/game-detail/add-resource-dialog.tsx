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

/* ─────────── 默认选项（API 未返回时的兜底） ─────────── */

const DEFAULT_OPTIONS = {
  platforms: ["Windows", "Android", "iOS", "MacOS", "Linux", "其他"],
  languages: ["简体中文", "繁体中文", "日文", "英文", "韩文", "其他"],
  runTypes: ["电脑硬盘", "手机模拟器", "安卓直装", "苹果直装", "原版镜像", "其他"],
  contentTypes: ["游戏本体", "补丁资源", "番外资源", "游戏存档", "其他"],
}

/* ─────────── 获取资源标签选项 ─────────── */

function useResourceTagOptions() {
  const [options, setOptions] = useState(DEFAULT_OPTIONS)

  useEffect(() => {
    fetch("/api/resource-tags")
      .then(r => r.json())
      .then(data => {
        setOptions({
          platforms: data.resource_platforms || DEFAULT_OPTIONS.platforms,
          languages: data.resource_languages || DEFAULT_OPTIONS.languages,
          runTypes: data.resource_run_types || DEFAULT_OPTIONS.runTypes,
          contentTypes: data.resource_content_types || DEFAULT_OPTIONS.contentTypes,
        })
      })
      .catch(() => { /* use defaults */ })
  }, [])

  return options
}

/* ─────────── 导出资源数据类型 ─────────── */

export interface SubmittedResource {
  id: string
  entries: {
    url: string
    extractCode: string
    decompressCode: string
    fileSize: string
  }[]
  platform: string[]
  language: string[]
  runType: string[]
  resourceContent: string[]
  resourceName: string
  resourceNote: string
  userId: string
  username: string
  userAvatar: string | null
  createdAt: string
}

/* ─────────── 必填标记 ─────────── */

function RequiredMark() {
  return <span className="text-red-500 ml-0.5">*</span>
}

/* ─────────── 浮动 Popover 多选组件 ─────────── */

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
    function handleClick(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handleClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("pointerdown", handleClick)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-all",
          "border border-foreground/15 bg-card hover:bg-muted",
          value.length > 0 ? "text-foreground" : "text-foreground/60"
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
                }}
                className={cn(
                  "w-full text-left px-4 py-3 text-base font-semibold transition-all flex items-center gap-2.5",
                  "hover:bg-muted",
                  value.includes(opt)
                    ? "text-primary bg-primary/10"
                    : "text-foreground"
                )}
              >
                <span className={cn(
                  "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                  value.includes(opt)
                    ? "bg-primary border-primary"
                    : "border-foreground/30"
                )}>
                  {value.includes(opt) && (
                    <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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

function genId(len = 8) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID().slice(0, len)
  return Math.random().toString(36).slice(2, 2 + len)
}

function createEmptyEntry(): ResourceEntry {
  return {
    id: genId(),
    url: "",
    extractCode: "",
    decompressCode: "",
    fileSize: "",
  }
}

/* ─────────── 主组件 ─────────── */

interface AddResourceDialogProps {
  gameId: string
  userId: string
  username: string
  userAvatar: string | null
  isLoggedIn: boolean
  onAdd?: (resource: SubmittedResource) => void
  /** 编辑模式：传入已有资源数据 */
  editData?: SubmittedResource | null
  /** 编辑完成回调 */
  onEdit?: (resource: SubmittedResource) => void
  /** 外部控制弹窗开关 */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** 是否隐藏触发按钮（外部控制时使用） */
  hideTrigger?: boolean
}

export function AddResourceDialog({
  gameId: _gameId,
  userId,
  username,
  userAvatar,
  isLoggedIn,
  onAdd,
  editData = null,
  onEdit,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: AddResourceDialogProps) {
  const tagOptions = useResourceTagOptions()
  const isEditMode = !!editData
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = useCallback((v: boolean) => {
    if (controlledOnOpenChange) controlledOnOpenChange(v)
    else setInternalOpen(v)
  }, [controlledOnOpenChange])
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

  // 编辑模式：初始化表单数据
  useEffect(() => {
    if (editData && open) {
      setEntries(editData.entries.length > 0
        ? editData.entries.map((e, i) => ({
            id: `edit-${i}`,
            url: e.url,
            extractCode: e.extractCode,
            decompressCode: e.decompressCode,
            fileSize: e.fileSize,
          }))
        : [createEmptyEntry()]
      )
      setPlatform(editData.platform || [])
      setLanguage(editData.language || [])
      setRunType(editData.runType || [])
      setResourceContent(editData.resourceContent || [])
      setResourceName(editData.resourceName || "")
      setResourceNote(editData.resourceNote || "")
      setSubmitAttempted(false)
      setSubmitting(false)
    }
  }, [editData, open])

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
    setSubmitting(false)
  }, [])

  // 检查必填项是否都已填写
  const isValid = useCallback(() => {
    const hasUrl = entries.every((e) => e.url.trim() !== "")
    const hasSelections = platform.length > 0 && language.length > 0 && runType.length > 0 && resourceContent.length > 0
    return hasUrl && hasSelections
  }, [entries, platform, language, runType, resourceContent])

  const handleSubmit = useCallback(async () => {
    setSubmitAttempted(true)
    if (!isValid() || submitting) return

    setSubmitting(true)

    const resource: SubmittedResource = {
      id: isEditMode && editData ? editData.id : genId(10),
      entries: entries.map(e => ({
        url: e.url.trim(),
        extractCode: e.extractCode.trim(),
        decompressCode: e.decompressCode.trim(),
        fileSize: e.fileSize.trim(),
      })),
      platform,
      language,
      runType,
      resourceContent,
      resourceName: resourceName.trim(),
      resourceNote: resourceNote.trim(),
      userId: isEditMode && editData ? editData.userId : userId,
      username: isEditMode && editData ? editData.username : username,
      userAvatar: isEditMode && editData ? editData.userAvatar : userAvatar,
      createdAt: isEditMode && editData ? editData.createdAt : new Date().toISOString(),
    }

    // 回调通知父组件（资源数据由父组件通过API持久化）
    if (isEditMode) {
      onEdit?.(resource)
    } else {
      onAdd?.(resource)
    }

    setOpen(false)
    handleReset()
  }, [entries, platform, language, runType, resourceContent, resourceName, resourceNote, userId, username, userAvatar, isValid, submitting, onAdd, onEdit, handleReset, isEditMode, editData, setOpen])

  const canSubmit = isValid() && !submitting

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset() }}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <button
            disabled={!isLoggedIn}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold",
              "bg-primary/10 text-primary hover:bg-primary/20",
              "transition-colors",
              !isLoggedIn && "opacity-50 cursor-not-allowed"
            )}
          >
            <Plus className="w-4 h-4" />
            添加资源
          </button>
        </DialogTrigger>
      )}

      <DialogContent
        showCloseButton
        className={cn(
          "w-[90vw] !max-w-[1152px] max-h-[90vh] overflow-y-auto p-0",
          "rounded-xl"
        )}
      >
        <DialogHeader className="px-4 sm:px-10 pt-6 sm:pt-10 pb-4 sm:pb-5">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">{isEditMode ? "编辑资源" : "添加资源"}</DialogTitle>
        </DialogHeader>

        <div className="px-4 sm:px-10 pb-6 sm:pb-10 space-y-6 sm:space-y-8">
          {/* ════════ 资源链接区 ════════ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-foreground">
                资源链接 <RequiredMark />
              </span>
              <button
                type="button"
                onClick={addEntry}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
                继续添加链接
              </button>
            </div>

            {entries.map((entry) => (
              <div
                key={entry.id}
                className="space-y-3 rounded-xl border border-foreground/15 bg-muted/30 p-5 relative"
              >
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-1.5">
                    <Link2 className="w-4 h-4 opacity-80" />
                    下载地址 <RequiredMark />
                  </label>
                  <input
                    type="url"
                    placeholder="请填写您的资源链接"
                    value={entry.url}
                    onChange={(e) => updateEntry(entry.id, "url", e.target.value)}
                    className={cn(
                      "w-full rounded-lg border bg-card text-foreground px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all",
                      submitAttempted && !entry.url.trim() ? "border-red-400" : "border-foreground/15"
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      提取码
                    </label>
                    <input
                      type="text"
                      placeholder="输入资源链接提取码，没有可留空"
                      value={entry.extractCode}
                      onChange={(e) => updateEntry(entry.id, "extractCode", e.target.value)}
                      className="w-full rounded-lg border border-foreground/15 bg-card text-foreground px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      解压码
                    </label>
                    <input
                      type="text"
                      placeholder="请填写压缩包解压码，没有可留空"
                      value={entry.decompressCode}
                      onChange={(e) => updateEntry(entry.id, "decompressCode", e.target.value)}
                      className="w-full rounded-lg border border-foreground/15 bg-card text-foreground px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    />
                  </div>
                </div>

                <div className="w-full md:w-1/2">
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    资源大小（MB或GB）
                  </label>
                  <input
                    type="text"
                    placeholder="请填写资源大小，如 2.5GB"
                    value={entry.fileSize}
                    onChange={(e) => updateEntry(entry.id, "fileSize", e.target.value)}
                    className="w-full rounded-lg border border-foreground/15 bg-card text-foreground px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ════════ 详情区 ════════ */}
          <div className="space-y-3">
            <span className="text-base font-bold text-foreground">
              资源详情 <RequiredMark />
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  平台 <RequiredMark />
                </label>
                <PopoverSelect
                  label="选择运行平台"
                  icon={<Monitor className="w-4 h-4" />}
                  options={tagOptions.platforms}
                  value={platform}
                  onChange={setPlatform}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  语言 <RequiredMark />
                </label>
                <PopoverSelect
                  label="选择游戏语言"
                  icon={<Globe className="w-4 h-4" />}
                  options={tagOptions.languages}
                  value={language}
                  onChange={setLanguage}
                />
              </div>
            </div>

            {submitAttempted && (platform.length === 0 || language.length === 0) && (
              <p className="text-sm text-red-500 font-medium">请填写上方的平台和语言</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  运行方式 <RequiredMark />
                </label>
                <PopoverSelect
                  label="选择运行方式"
                  icon={<HardDrive className="w-4 h-4" />}
                  options={tagOptions.runTypes}
                  value={runType}
                  onChange={setRunType}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  资源内容 <RequiredMark />
                </label>
                <PopoverSelect
                  label="选择资源类型"
                  icon={<FileText className="w-4 h-4" />}
                  options={tagOptions.contentTypes}
                  value={resourceContent}
                  onChange={setResourceContent}
                />
              </div>
            </div>

            {submitAttempted && (runType.length === 0 || resourceContent.length === 0) && (
              <p className="text-sm text-red-500 font-medium">请填写运行方式和资源内容</p>
            )}
          </div>

          {/* ════════ 可选信息 ════════ */}
          <div className="space-y-3">
            <span className="text-base font-bold text-foreground">
              补充信息（可选）
            </span>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                资源名称
              </label>
              <input
                type="text"
                placeholder="请填写您的资源名称"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                className="w-full rounded-lg border border-foreground/15 bg-card text-foreground px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                资源备注
              </label>
              <input
                type="text"
                placeholder="请按需填写备注信息，如用途、来源等"
                value={resourceNote}
                onChange={(e) => setResourceNote(e.target.value)}
                className="w-full rounded-lg border border-foreground/15 bg-card text-foreground px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
          </div>

          {/* ════════ 提交按钮 ════════ */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "w-full rounded-xl py-4 text-base font-bold transition-all",
              canSubmit
                ? "text-primary-foreground bg-primary hover:opacity-90 active:scale-[0.98]"
                : "text-primary-foreground/70 bg-primary/50 cursor-not-allowed"
            )}
          >
            {submitting ? "提交中…" : canSubmit ? (isEditMode ? "保存修改" : "提交资源") : "还有必填项没填完哦"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}