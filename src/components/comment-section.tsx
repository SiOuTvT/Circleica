"use client"

import { cn } from "@/lib/utils"
import { Heart, ImageIcon, Send, Smile, X } from "lucide-react"
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

function Avatar({ user }: { user: Comment["user"] }) {
  if (user.avatar) {
    return <Image src={user.avatar} alt={user.username} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-500 text-xs font-bold text-white">
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

export function CommentSection({ gameId, comments: init, isLoggedIn }: Props) {
  const [comments, setComments] = useState(init)
  const [content, setContent] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return
    if (file.size > 5 * 1024 * 1024) {
      alert("图片大小不能超过 5MB")
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

  // 拖拽上传
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

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.slice(0, start) + emoji + content.slice(end)
      setContent(newContent)
      // 保持光标位置，但不关闭表情面板
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length
        textarea.focus()
      }, 0)
    } else {
      setContent(content + emoji)
    }
    // 不关闭表情面板，让用户可以连续选择
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
    const fd = new FormData()
    fd.append("content", content.trim())
    if (selectedFile) fd.append("image", selectedFile)

    const res = await fetch(`/api/games/${gameId}/comments`, { method: "POST", body: fd })
    if (res.ok) {
      const c = await res.json()
      setComments((prev) => [c, ...prev])
      setContent("")
      removePreview()
      setShowEmoji(false)
    }
    setSubmitting(false)
  }

  async function likeComment(commentId: string) {
    const res = await fetch(`/api/comments/${commentId}/like`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likeCount: data.count } : c))
    }
  }

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <span className="h-4 w-0.5 rounded-full bg-gradient-to-b from-blue-400 to-blue-400" />
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
              isDragging ? "ring-blue-500/50 bg-blue-500/5 light:bg-blue-500/5" : "ring-white/[0.06] light:ring-black/[0.06] focus-within:ring-white/[0.12] light:focus-within:ring-black/[0.12]"
            )}
          >
            {/* 图片预览 */}
            {previewUrl && (
              <div className="px-3 pt-3">
                <div className="relative inline-block group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="预览" className="h-20 w-20 rounded-lg object-cover ring-1 ring-white/10" />
                  <button type="button" onClick={removePreview}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 hover:text-white">
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {/* 输入区域 */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isDragging ? "释放以添加图片…" : "写下你的想法…"}
              rows={2}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
            />

            {/* 工具栏 */}
            <div className="flex items-center gap-1 border-t border-white/[0.04] px-2 py-1.5">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                title="上传图片">
                <ImageIcon className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />

              <div className="relative">
                <button type="button" onClick={() => setShowEmoji(!showEmoji)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    showEmoji ? "bg-zinc-800 text-blue-400" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  )}
                  title="表情">
                  <Smile className="h-4 w-4" strokeWidth={1.5} />
                </button>
                {/* 表情面板 - 点击外部关闭 */}
                {showEmoji && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                    <div className="absolute bottom-10 left-0 z-50 w-72 rounded-xl bg-zinc-900 light:bg-white p-3 ring-1 ring-white/10 light:ring-black/10 shadow-2xl">
                      {EMOJI_CATEGORIES.map((cat) => (
                        <div key={cat.name} className="mb-2 last:mb-0">
                          <p className="mb-1.5 text-[10px] font-medium text-zinc-600">{cat.name}</p>
                          <div className="grid grid-cols-10 gap-1">
                            {cat.emojis.map((emoji) => (
                              <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-zinc-800 transition-colors active:scale-90">
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
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-500 px-4 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                {submitting ? "发送中…" : "发送"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mb-6 text-sm text-zinc-500">
          <a href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">登录</a>后可以发表评论
        </p>
      )}

      {/* 评论列表 */}
      <div className="space-y-4">
        {comments.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-600">还没有评论，来说点什么吧~</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="group flex gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.02]">
            <Avatar user={c.user} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-zinc-300">{c.user.username}</span>
                <span className="text-[10px] text-zinc-600">
                  {new Date(c.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {c.content && <p className="text-sm leading-relaxed text-zinc-400 whitespace-pre-wrap break-words">{c.content}</p>}
              {c.imageUrl && (
                <a href={c.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block max-w-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt="评论图片" className="rounded-xl object-cover ring-1 ring-white/[0.06] max-h-60 hover:ring-white/10 transition-all" />
                </a>
              )}
              <button onClick={() => isLoggedIn && likeComment(c.id)}
                className={cn(
                  "mt-1.5 flex items-center gap-1 text-[11px] transition-colors",
                  isLoggedIn ? "text-zinc-600 hover:text-blue-400 cursor-pointer" : "text-zinc-700 cursor-default"
                )}>
                <Heart className="h-3 w-3" strokeWidth={1.5} />
                {c.likeCount > 0 && c.likeCount}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}