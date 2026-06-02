"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import { Heart, ImageIcon, Send, Smile, Trash2, X } from "lucide-react"
import Image from "next/image"
import { useCallback, useRef, useState } from "react"

interface Comment {
  id: string
  content: string
  imageUrl?: string | null
  likeCount: number
  createdAt: string
  user: { id: string; username: string; avatar: string | null }
}

interface Props {
  gameId: string
  comments: Comment[]
  isLoggedIn: boolean
  currentUserId?: string
}

type SortMode = "newest" | "hottest"

function Avatar({ user }: { user: Comment["user"] }) {
  if (user.avatar) {
    return <Image src={user.avatar} alt={user.username} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/80 text-xs font-bold text-primary-foreground">
      {user.username[0].toUpperCase()}
    </div>
  )
}

// 表情列表 - 分类
const EMOJI_CATEGORIES = [
  {
    name: "常用",
    emojis: ["😀", "😂", "🤣", "😍", "🥰", "😘", "😋", "🤔", "😎", "🥺", "😭", "😤", "🤯", "🥳", "🤩", "😴", "🤮", "👻", "💀", "🤡"]
  },
  {
    name: "手势",
    emojis: ["👍", "👎", "❤️", "🔥", "⭐", "🎉", "🎮", "🎵", "✨", "💯", "🙏", "💪", "👀", "🤝", "👏", "🫡", "🫠", "😈", "🐱", "🐶"]
  }
]

export function CommentSection({ gameId, comments: init, isLoggedIn, currentUserId }: Props) {
  const [comments, setComments] = useState(init)
  const [content, setContent] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>("newest")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("图片太大啦，最多 5MB 哦")
      return
    }
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  function autoResize(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto"
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px"
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.slice(0, start) + emoji + content.slice(end)
      setContent(newContent)
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length
        textarea.focus()
      }, 0)
    } else {
      setContent(content + emoji)
    }
  }

  function removePreview() {
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() && !selectedFile) return
    setSubmitting(true)
    setSubmitError(null)
    const fd = new FormData()
    fd.append("content", content.trim())
    if (selectedFile) fd.append("image", selectedFile)

    try {
      const res = await fetch(`/api/games/${gameId}/comments`, { method: "POST", body: fd })
      if (res.ok) {
        const c = await res.json()
        setComments((prev) => sortMode === "newest" ? [c, ...prev] : [...prev, c])
        setContent("")
        removePreview()
        setShowEmoji(false)
      } else {
        const err = await res.json().catch(() => ({ error: "发送失败了，再试试？" }))
        setSubmitError(err.error || "发送失败了，再试试？")
      }
    } catch {
      setSubmitError("网络好像不太给力，检查一下？")
    } finally {
      setSubmitting(false)
    }
  }

  async function likeComment(commentId: string) {
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likeCount: data.count } : c))
      }
    } catch {
      // silent fail for like
    }
  }

  async function deleteComment(commentId: string) {
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" })
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      }
    } catch {
      // silent fail
    }
    setDeletingId(null)
  }

  const sortedComments = [...comments].sort((a, b) => {
    if (sortMode === "hottest") return b.likeCount - a.likeCount
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-200 light:text-zinc-800">
        <span className="h-4 w-0.5 rounded-full bg-primary" />
        评论
        <span className="text-xs font-normal text-zinc-500">{comments.length}</span>
      </h2>

      {/* 发评论 */}
      {isLoggedIn ? (
        <form onSubmit={submit} className="mb-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "rounded-2xl bg-zinc-900/80 light:bg-zinc-100 ring-1 transition-all overflow-hidden",
              isDragging ? "ring-primary/50 bg-primary/5 light:bg-primary/5" : "ring-white/[0.06] light:ring-black/[0.06] focus-within:ring-white/[0.12] light:focus-within:ring-black/[0.12]"
            )}
          >
            {/* 图片预览 */}
            {previewUrl && (
              <div className="px-3 pt-3">
                <div className="relative inline-block group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="预览" className="h-20 w-20 rounded-lg object-cover ring-1 ring-white/10 light:ring-black/10" />
                  <button type="button" onClick={removePreview}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700 light:bg-zinc-300 text-zinc-300 light:text-zinc-700 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-500/80 hover:text-white"
                    aria-label="移除图片">
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {/* 输入区域 */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => { setContent(e.target.value); autoResize(e.target) }}
              placeholder={isDragging ? "释放以添加图片…" : "写下评论…"}
              rows={2}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-zinc-200 light:text-zinc-800 placeholder:text-zinc-600 light:placeholder:text-zinc-400 outline-none"
              style={{ minHeight: "3.5rem" }}
            />

            {/* 错误提示 */}
            {submitError && (
              <div className="flex items-center gap-2 border-t border-white/[0.04] light:border-black/[0.04] bg-red-500/5 px-4 py-2">
                <span className="text-xs text-red-400">{submitError}</span>
                <button type="button" onClick={() => submit({ preventDefault: () => {} } as React.FormEvent)}
                  className="ml-auto text-xs font-medium text-red-400 hover:text-red-300 transition-colors underline underline-offset-2">
                  重试
                </button>
                <button type="button" onClick={() => setSubmitError(null)}
                  className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-600 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* 工具栏 */}
            <div className="flex items-center gap-1 border-t border-white/[0.04] light:border-black/[0.04] px-2 py-1.5">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 light:hover:bg-zinc-200 hover:text-zinc-300 light:hover:text-zinc-600"
                title="上传图片">
                <ImageIcon className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />

              <div className="relative">
                <button type="button" onClick={() => setShowEmoji(!showEmoji)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    showEmoji
                      ? "bg-zinc-800 light:bg-zinc-200 text-primary"
                      : "text-zinc-500 hover:bg-zinc-800 light:hover:bg-zinc-200 hover:text-zinc-300 light:hover:text-zinc-600"
                  )}
                  title="表情">
                  <Smile className="h-4 w-4" strokeWidth={1.5} />
                </button>
                {showEmoji && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                    <div className="absolute bottom-10 left-0 z-50 w-72 rounded-xl bg-zinc-900 light:bg-white p-3 ring-1 ring-white/10 light:ring-black/10 shadow-2xl">
                      {EMOJI_CATEGORIES.map((cat) => (
                        <div key={cat.name} className="mb-2 last:mb-0">
                          <p className="mb-1.5 text-[10px] font-medium text-zinc-600 light:text-zinc-400">{cat.name}</p>
                          <div className="grid grid-cols-10 gap-1">
                            {cat.emojis.map((emoji) => (
                              <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-zinc-800 light:hover:bg-zinc-200 transition-colors active:scale-90">
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1" />

              <button type="submit" disabled={submitting || (!content.trim() && !selectedFile)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                {submitting ? "发送中…" : "发送"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mb-6 text-sm text-zinc-500">
          <a href="/login" className="text-primary hover:text-primary/80 transition-colors">登录</a>后发表评论
        </p>
      )}

      {/* 排序切换 */}
      {comments.length > 1 && (
        <div className="mb-4 flex items-center gap-1">
          <button
            onClick={() => setSortMode("newest")}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
              sortMode === "newest"
                ? "bg-zinc-800 light:bg-zinc-200 text-zinc-200 light:text-zinc-800"
                : "text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-600"
            )}
          >
            最新
          </button>
          <button
            onClick={() => setSortMode("hottest")}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
              sortMode === "hottest"
                ? "bg-zinc-800 light:bg-zinc-200 text-zinc-200 light:text-zinc-800"
                : "text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-600"
            )}
          >
            最热
          </button>
        </div>
      )}

      {/* 评论列表 */}
      <div className="space-y-4">
        {sortedComments.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-600 light:text-zinc-400">还没有评论，来说点什么吧~</p>
        )}
        {sortedComments.map((c) => (
          <div key={c.id} className="group flex gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.02] light:hover:bg-black/[0.02]">
            <Avatar user={c.user} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-zinc-300 light:text-zinc-700">{c.user.username}</span>
                <span className="text-[10px] text-zinc-600 light:text-zinc-400">
                  {new Date(c.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                {currentUserId === c.user.id && (
                  <div className="flex items-center gap-0.5 ml-auto sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setDeletingId(c.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 light:text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      aria-label="删除评论"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
              {c.content && <p className="text-sm leading-relaxed text-zinc-400 light:text-zinc-600 whitespace-pre-wrap break-words">{c.content}</p>}
              {c.imageUrl && (
                <a href={c.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block max-w-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt="评论图片" className="rounded-xl object-cover ring-1 ring-white/[0.06] light:ring-black/[0.06] max-h-60 hover:ring-white/10 light:hover:ring-black/10 transition-all" />
                </a>
              )}
              <button onClick={() => isLoggedIn && likeComment(c.id)}
                className={cn(
                  "mt-1.5 flex items-center gap-1 rounded-md px-1.5 py-1 -mx-1.5 -my-1 text-[11px] transition-colors",
                  isLoggedIn ? "text-zinc-600 light:text-zinc-400 hover:text-primary cursor-pointer" : "text-zinc-700 light:text-zinc-300 cursor-default"
                )}
                aria-label={c.likeCount > 0 ? `${c.likeCount} 个赞` : "点赞"}
              >
                <Heart className="h-4 w-4" strokeWidth={1.5} />
                {c.likeCount > 0 && c.likeCount}
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null) }}
        title="删除评论"
        description="确定要删除这条评论吗？删了就找不回来了。"
        variant="destructive"
        onConfirm={() => { if (deletingId) deleteComment(deletingId) }}
      />
    </section>
  )
}
