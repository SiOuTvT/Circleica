"use client"

import { ImageUpload } from "@/components/image-upload"
import { useEmotionalMessage } from "@/hooks/use-emotional-messages"
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, User } from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface Props {
  user: { id: string; username: string; bio: string; avatar: string; banner: string; uid: string }
}

export function ProfileEditForm({ user }: Props) {
  const router = useRouter()
  const { update: updateSession } = useSession()

  const [username, setUsername] = useState(user.username)
  const [bio, setBio] = useState(user.bio)
  const [avatarData, setAvatarData] = useState(user.avatar)
  const [bannerData, setBannerData] = useState(user.banner)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { message: profileMsg } = useEmotionalMessage("success_profile")

  async function handleAvatarUpload(file: File): Promise<string> {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("头像太大啦，最多 5MB 哦")
    }
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    const data = await res.json()
    if (!res.ok || !data.url) throw new Error(data.error || "上传失败了，再试试？")
    return data.url
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (newPassword && newPassword.length < 6) {
      setError("新密码至少6位")
      return
    }

    setSaving(true)

    const res = await fetch("/api/profile/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        bio: bio.trim(),
        avatar: avatarData,
        oldPassword: oldPassword || undefined,
        newPassword: newPassword || undefined,
      }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    await updateSession({ name: data.username || username.trim() })

    window.dispatchEvent(
      new CustomEvent("profile-updated", {
        detail: { image: data.avatar || avatarData, name: data.username || username.trim() },
      })
    )

    setSuccess(profileMsg ? `${profileMsg.emoji} ${profileMsg.title}` : "保存成功！")
    setOldPassword("")
    setNewPassword("")
    setTimeout(() => {
      router.refresh()
      router.push(`/user/${user.id}`)
    }, 800)
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
      {/* 返回按钮 */}
      <Link
        href={`/user/${user.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        返回主页
      </Link>

      {/* 全局提示 */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 ring-1 ring-emerald-500/20">
          {success}
        </div>
      )}

      {/* 统一卡片 */}
      <div className="rounded-2xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        {/* 头部：头像 + 用户名 + UID */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-5 sm:p-6">
          <div className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] shrink-0">
            <ImageUpload
              value={avatarData}
              onChange={setAvatarData}
              uploadFunction={handleAvatarUpload}
              aspectRatio={1}
              maxSizeMB={5}
              shape="circle"
              placeholder="上传头像"
            />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xl font-semibold text-foreground">{username || user.username}</p>
            <p className="mt-1 text-sm text-muted-foreground">UID: {user.uid}</p>
            <p className="mt-2 text-xs text-muted-foreground">点击头像就可以换啦 · JPG/PNG/WebP · 最大 5MB</p>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="h-px bg-border/30" />

        {/* 基本信息 */}
        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <label className="block mb-2 text-xs font-semibold text-muted-foreground">
              用户名
            </label>
            <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus-within:ring-primary/30 transition-all">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="用户名"
                maxLength={20}
                required
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-xs font-semibold text-muted-foreground">
              个人简介
            </label>
            <div className="rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus-within:ring-primary/30 transition-all">
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="介绍一下自己吧…（选填）"
                maxLength={200}
                rows={4}
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{bio.length}/200</p>
            </div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="h-px bg-border/30" />

        {/* 修改密码 */}
        <div className="p-5 sm:p-6 bg-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <h3 className="text-xs font-semibold text-muted-foreground">修改密码</h3>
            <span className="text-[10px] text-muted-foreground">不想改的话留空就好~</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-xs font-medium text-muted-foreground">当前密码</label>
              <div className="flex items-center gap-3 rounded-xl bg-secondary/60 px-4 py-3 ring-1 ring-border/50 focus-within:ring-primary/30 transition-all">
                <input
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="输入当前密码"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(v => !v)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showOld ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block mb-2 text-xs font-medium text-muted-foreground">新密码</label>
              <div className="flex items-center gap-3 rounded-xl bg-secondary/60 px-4 py-3 ring-1 ring-border/50 focus-within:ring-primary/30 transition-all">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="设置新密码（至少6位）"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNew ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="h-px bg-border/30" />

        {/* 保存按钮 */}
        <div className="p-5 sm:p-6">
          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
            {saving ? "保存中…" : "保存修改"}
          </button>
        </div>
      </div>
    </form>
  )
}
