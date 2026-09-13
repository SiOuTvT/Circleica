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
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { apiFetchSafe } from "@/lib/api-client"

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
    apiFetchSafe<{
      resource_platforms?: string[]
      resource_languages?: string[]
      resource_run_types?: string[]
      resource_content_types?: string[]
    }>("/api/resource-tags")
      .then(({ data }) => {
        if (data) setOptions({
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
    id?: string
    url: string
    extractCode: string
    decompressCode: string
    fileSize: string
    downloadCount?: number
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
  return <span className="text-red-400 ml-0.5">*</span>
}

/** 四段的组标题：16px/700，组标题本身不带星号（星号只给真正的必填字段） */
function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-bold text-foreground">{children}</h3>
}

/* ─────────── 字段样式（弹窗内所有可填控件同一档） ─────────── */

/**
 * 弹窗内 input / textarea / 下拉触发按钮共用同一档：
 * rounded-lg（本项目 @theme 重映射为 18px）+ px-3.5 py-2.5 + text-[15px] + border-2，
 * 与 ui/input.tsx 的基类保持一致（不新增圆角或高度档位，全站基线不动）。
 */
const fieldBase =
  "w-full rounded-lg border-2 border-input bg-transparent text-foreground px-3.5 py-2.5 text-[15px] outline-none transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter,border-radius] duration-300 ease-out focus:rounded-none focus:border-primary"

function fieldClass(invalid: boolean, extra?: string) {
  return cn(fieldBase, invalid ? "border-red-400" : "border-foreground/15", extra)
}

/* ─────────── 浮动 Popover 多选组件 ─────────── */

function PopoverSelect({ id, label, icon, options, value, onChange, invalid, onBlur }: {
  id?: string
  label: string
  icon: React.ReactNode
  options: string[]
  value: string[]
  onChange: (val: string[]) => void
  invalid?: boolean
  onBlur?: () => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggle = useCallback(() => {
    setOpen(prev => {
      // 关闭时视为一次“碰过”，便于缺项描边只在该出现时出现
      if (prev) onBlur?.()
      return !prev
    })
  }, [onBlur])

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
        id={id}
        type="button"
        onClick={toggle}
        className={cn(
          // 与 input 同档：圆角/内边距/字号全对齐（实测高度落在同一值上）
          "flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[15px] font-semibold transition duration-150 ease-in-out",
          "border-2 bg-card hover:bg-muted",
          invalid ? "border-red-400" : "border-input",
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
          <div className="rounded-xl border border-foreground/15 bg-card shadow-3 overflow-clip max-h-56 overflow-y-auto">
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
                  "w-full text-left px-4 py-3 text-[15px] font-semibold transition duration-150 ease-in-out flex items-center gap-2.5",
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
                    <svg className="h-3.5 w-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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

/** 缺项定位用的字段 id（自己定义，不猜 DOM 结构） */
const fieldId = (key: string) => `resource-field-${key}`

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
  /** 碰过的字段：缺项描边只在这些字段（或提交尝试后）出现，避免一打开就一片红 */
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // 资源链接列表
  const [entries, setEntries] = useState<ResourceEntry[]>([createEmptyEntry()])

  // 详情选择（多选）
  const [platform, setPlatform] = useState<string[]>([])
  const [language, setLanguage] = useState<string[]>([])
  const [runType, setRunType] = useState<string[]>([])
  const [resourceContent, setResourceContent] = useState<string[]>([])

  // 资源名称 & 备注
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
      setTouched({})
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
    setTouched({})
  }, [])

  const markTouched = useCallback((key: string) => {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
  }, [])

  /* ── 缺项清单：操作条左侧的提示与字段描边都从这里取，唯一来源 ── */
  const missing = useMemo(() => {
    const list: { key: string; label: string }[] = []
    if (!resourceName.trim()) list.push({ key: "resourceName", label: "资源名称" })
    if (entries.some((e) => !e.url.trim())) list.push({ key: "entryUrl", label: "下载链接" })
    if (platform.length === 0) list.push({ key: "platform", label: "平台" })
    if (language.length === 0) list.push({ key: "language", label: "语言" })
    if (runType.length === 0) list.push({ key: "runType", label: "运行方式" })
    if (resourceContent.length === 0) list.push({ key: "resourceContent", label: "资源内容" })
    return list
  }, [resourceName, entries, platform, language, runType, resourceContent])

  const isMissing = useCallback((key: string) => missing.some((m) => m.key === key), [missing])
  // 是否亮红：确实缺 + （用户碰过它 或 已尝试提交）
  const showInvalid = useCallback(
    (key: string) => isMissing(key) && (submitAttempted || !!touched[key]),
    [isMissing, submitAttempted, touched]
  )

  const isValid = useCallback(() => missing.length === 0, [missing])

  /** 点提示行里的名字 → 滚到并聚焦对应控件（id 是本文件自己定义的，不猜） */
  const focusField = useCallback((key: string) => {
    setSubmitAttempted(true)
    let id = fieldId(key)
    if (key === "entryUrl") {
      const target = entries.find((e) => !e.url.trim()) ?? entries[0]
      if (target) id = fieldId(`url-${target.id}`)
    }
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    el.focus({ preventScroll: true })
  }, [entries])

  const handleSubmit = useCallback(async () => {
    setSubmitAttempted(true)
    if (!isValid() || submitting) return

    setSubmitting(true)
    try {
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
    } finally {
      setSubmitting(false)
    }
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
            <Plus className="h-4 w-4" />
            添加资源
          </button>
        </DialogTrigger>
      )}

      {/* 弹窗整体为纵向 flex：头部固定 / 内容可滚 / 操作条常驻底部（不随内容滚走） */}
      <DialogContent
        showCloseButton
        className={cn(
          // gap-0：DialogContent 基类带 gap-4，纵向三段（头部 / 滚动区 / 操作条）之间不留空
          "flex w-[90vw] !max-w-[1152px] max-h-[92vh] flex-col gap-0 overflow-hidden p-0",
          "rounded-xl"
        )}
      >
        <DialogHeader className="shrink-0 px-4 sm:px-10 pt-6 sm:pt-10 pb-4 sm:pb-5">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">{isEditMode ? "编辑资源" : "添加资源"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 sm:px-10 pb-6 sm:pb-8">
          {/* ① 基本信息 */}
          <section className="space-y-3">
            <GroupTitle>基本信息</GroupTitle>
            <div>
              <label htmlFor={fieldId("resourceName")} className="text-sm font-semibold text-foreground mb-1.5 flex items-center">
                资源名称 <RequiredMark />
              </label>
              <input
                id={fieldId("resourceName")}
                type="text"
                placeholder="例：简体中文重制整合包 v2（含补丁）"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                onBlur={() => markTouched("resourceName")}
                className={fieldClass(showInvalid("resourceName"))}
              />
            </div>
          </section>

          {/* ② 说明 */}
          <section className="space-y-3">
            <GroupTitle>说明</GroupTitle>
            <div>
              <label htmlFor={fieldId("resourceNote")} className="text-sm font-semibold text-foreground mb-1.5 block">
                资源备注
              </label>
              <textarea
                id={fieldId("resourceNote")}
                rows={3}
                placeholder="按需填写备注信息，如用途、来源等"
                value={resourceNote}
                onChange={(e) => setResourceNote(e.target.value)}
                className={cn(fieldBase, "resize-y border-foreground/15 py-2.5")}
              />
            </div>
          </section>

          {/* ③ 分流（可多条） */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <GroupTitle>分流</GroupTitle>
              <button
                type="button"
                onClick={addEntry}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground ring-1 ring-border transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                添加分流
              </button>
            </div>

            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="space-y-3 rounded-xl border border-foreground/15 bg-muted/30 p-4 relative"
              >
                <div className="flex items-center justify-between gap-3">
                  {entries.length > 1 && (
                    <span className="text-[11px] font-medium text-muted-foreground">分流 {index + 1}</span>
                  )}
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={`删除分流 ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* 下载链接：必填主字段，独占整行 */}
                <div>
                  <label htmlFor={fieldId(`url-${entry.id}`)} className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-1.5">
                    <Link2 className="h-4 w-4 opacity-80" />
                    下载链接 <RequiredMark />
                  </label>
                  <input
                    id={fieldId(`url-${entry.id}`)}
                    type="url"
                    placeholder="请填写资源链接"
                    value={entry.url}
                    onChange={(e) => updateEntry(entry.id, "url", e.target.value)}
                    onBlur={() => markTouched("entryUrl")}
                    className={fieldClass(showInvalid("entryUrl") && !entry.url.trim())}
                  />
                </div>

                {/* 提取码 / 解压码 / 文件大小：一行三列等宽 */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label htmlFor={fieldId(`extract-${entry.id}`)} className="text-sm font-semibold text-foreground mb-1.5 block">
                      提取码
                    </label>
                    <input
                      id={fieldId(`extract-${entry.id}`)}
                      type="text"
                      placeholder="没有可留空"
                      value={entry.extractCode}
                      onChange={(e) => updateEntry(entry.id, "extractCode", e.target.value)}
                      className={fieldClass(false)}
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId(`decompress-${entry.id}`)} className="text-sm font-semibold text-foreground mb-1.5 block">
                      解压码
                    </label>
                    <input
                      id={fieldId(`decompress-${entry.id}`)}
                      type="text"
                      placeholder="没有可留空"
                      value={entry.decompressCode}
                      onChange={(e) => updateEntry(entry.id, "decompressCode", e.target.value)}
                      className={fieldClass(false)}
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId(`size-${entry.id}`)} className="text-sm font-semibold text-foreground mb-1.5 block">
                      文件大小
                    </label>
                    <input
                      id={fieldId(`size-${entry.id}`)}
                      type="text"
                      placeholder="如 2.5GB"
                      value={entry.fileSize}
                      onChange={(e) => updateEntry(entry.id, "fileSize", e.target.value)}
                      className={fieldClass(false)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* ④ 资源标签（四组都是必填，沿用标签组色） */}
          <section className="space-y-3">
            <GroupTitle>资源标签</GroupTitle>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label htmlFor={fieldId("platform")} className="text-sm font-semibold text-foreground mb-1.5 flex items-center">
                  平台 <RequiredMark />
                </label>
                <PopoverSelect
                  id={fieldId("platform")}
                  label="选择运行平台"
                  icon={<Monitor className="h-4 w-4" />}
                  options={tagOptions.platforms}
                  value={platform}
                  onChange={setPlatform}
                  invalid={showInvalid("platform")}
                  onBlur={() => markTouched("platform")}
                />
              </div>
              <div>
                <label htmlFor={fieldId("language")} className="text-sm font-semibold text-foreground mb-1.5 flex items-center">
                  语言 <RequiredMark />
                </label>
                <PopoverSelect
                  id={fieldId("language")}
                  label="选择游戏语言"
                  icon={<Globe className="h-4 w-4" />}
                  options={tagOptions.languages}
                  value={language}
                  onChange={setLanguage}
                  invalid={showInvalid("language")}
                  onBlur={() => markTouched("language")}
                />
              </div>
              <div>
                <label htmlFor={fieldId("runType")} className="text-sm font-semibold text-foreground mb-1.5 flex items-center">
                  运行方式 <RequiredMark />
                </label>
                <PopoverSelect
                  id={fieldId("runType")}
                  label="选择运行方式"
                  icon={<HardDrive className="h-4 w-4" />}
                  options={tagOptions.runTypes}
                  value={runType}
                  onChange={setRunType}
                  invalid={showInvalid("runType")}
                  onBlur={() => markTouched("runType")}
                />
              </div>
              <div>
                <label htmlFor={fieldId("resourceContent")} className="text-sm font-semibold text-foreground mb-1.5 flex items-center">
                  资源内容 <RequiredMark />
                </label>
                <PopoverSelect
                  id={fieldId("resourceContent")}
                  label="选择资源类型"
                  icon={<FileText className="h-4 w-4" />}
                  options={tagOptions.contentTypes}
                  value={resourceContent}
                  onChange={setResourceContent}
                  invalid={showInvalid("resourceContent")}
                  onBlur={() => markTouched("resourceContent")}
                />
              </div>
            </div>
          </section>
        </div>

        {/* ── 底部操作条：常驻，不随内容滚走 ── */}
        <div className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-card px-4 sm:px-10 py-3">
          <p className="mb-2 text-xs text-muted-foreground">
            提交后进入人工审核，通过后才会显示在游戏页。
          </p>
          <div className="flex items-center gap-3">
            {/* 缺项提示：写明具体缺什么，点名字能定位到控件 */}
            <div className="min-w-0 flex-1">
              {missing.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  还差 {missing.length} 项：
                  {missing.length <= 4 ? (
                    missing.map((m, i) => (
                      <span key={m.key}>
                        {i > 0 && "、"}
                        <button
                          type="button"
                          onClick={() => focusField(m.key)}
                          className="underline underline-offset-2 hover:text-foreground transition-colors"
                        >
                          {m.label}
                        </button>
                      </span>
                    ))
                  ) : null}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-6 text-sm font-semibold transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,transform-origin,filter,backdrop-filter] duration-150 ease-in-out",
                canSubmit
                  ? "text-primary-foreground bg-primary hover:opacity-90 active:scale-[0.98]"
                  : "text-primary-foreground/70 bg-primary/50 cursor-not-allowed"
              )}
            >
              {submitting ? "提交中…" : "提交"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
