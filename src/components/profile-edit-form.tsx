"use client"

import { ImageUpload } from "@/components/image-upload"
import { Textarea } from "@/components/ui/textarea"
import { AvatarFrameSelector } from "@/components/avatar-frame-selector"
import { useEmotionalMessage } from "@/hooks/use-emotional-messages"
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useId } from "react"
import { apiFetchSafe } from "@/lib/api-client"

interface Props {
  user: {
    id: string
    username: string
    email: string
    bio: string
    avatar: string
    banner: string
    uid: string
    avatarFrameId: string | null
  }
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

  const usernameId = useId()
  const bioId = useId()
  const oldPwId = useId()
  const newPwId = useId()

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

  async function handleBannerUpload(file: File): Promise<string> {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("封面太大啦，最多 10MB 哦")
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

    if (newPassword) {
      if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        setError("新密码至少8位，且需同时包含字母和数字")
        return
      }
    }

    setSaving(true)

    const { ok, data, error } = await apiFetchSafe<{ username?: string; avatar?: string }>("/api/profile/edit", {
      method: "PUT",
      body: {
        username: username.trim(),
        bio: bio.trim(),
        avatar: avatarData,
        banner: bannerData,
        oldPassword: oldPassword || undefined,
        newPassword: newPassword || undefined,
      },
    })
    setSaving(false)

    if (!ok) {
      setError(error ?? "")
      return
    }

    await updateSession({ name: data?.username || username.trim() })

    window.dispatchEvent(
      new CustomEvent("profile-updated", {
        detail: { image: data?.avatar || avatarData, name: data?.username || username.trim() },
      })
    )

    setSuccess(profileMsg ? profileMsg.title : "保存成功！")
    setOldPassword("")
    setNewPassword("")
    setTimeout(() => {
      router.refresh()
      router.push(`/user/${user.id}`)
    }, 800)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
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

      <div className="flex flex-col lg:flex-row items-stretch min-w-0 gap-0">
        {/* 左栏：形象 */}
        <aside className="w-full lg:w-[380px] lg:shrink-0 min-w-0 order-1 lg:order-none flex flex-col gap-5">
          {/* 个人形象 */}
          <section className="rounded-2xl bg-card border border-border p-6 sm:p-8">
            <h2 className="mb-4 text-sm font-semibold text-foreground">个人形象</h2>
            <div className="flex flex-col items-center">
              <div className="h-[150px] w-[150px] sm:h-[160px] sm:w-[160px]">
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
              <p className="mt-3 text-center text-micro text-muted-foreground">
                点击头像就可以换啦 · JPG/PNG/WebP · 最大 5MB
              </p>
              <p className="mt-1 text-center text-micro text-muted-foreground/70">UID: {user.uid}</p>
            </div>
          </section>

          {/* 个人封面 */}
          <section className="rounded-2xl bg-card border border-border p-6 sm:p-8">
            <h2 className="mb-4 text-sm font-semibold text-foreground">个人封面</h2>
            <ImageUpload
              value={bannerData}
              onChange={setBannerData}
              uploadFunction={handleBannerUpload}
              aspectRatio={3}
              maxSizeMB={10}
              shape="rounded"
              placeholder="上传封面图"
            />
            <p className="mt-2 text-micro text-muted-foreground">
              推荐尺寸 900×300 · JPG/PNG/WebP · 最大 10MB · 不填就用默认背景
            </p>
          </section>

          {/* 头像框 */}
          <section className="rounded-2xl bg-card border border-border p-6 sm:p-8">
            <h2 className="mb-4 text-sm font-semibold text-foreground">头像框</h2>
            <AvatarFrameSelector
              currentFrameId={user.avatarFrameId}
              userImage={avatarData || user.avatar}
              userName={user.username}
              compact
            />
          </section>
        </aside>

        {/* 右栏：信息 + 安全 */}
        <main className="w-full lg:w-[calc(100%-396px)] lg:shrink-0 flex flex-col lg:ml-4 min-w-0 order-2 lg:order-none gap-5">
          {/* 基本信息 */}
          <section className="rounded-2xl bg-card border border-border p-6 sm:p-8 space-y-6">
            <h2 className="text-sm font-semibold text-foreground">基本信息</h2>

            <div>
              <label htmlFor={usernameId} className="block mb-2 text-xs font-semibold text-muted-foreground">
                用户名
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-input bg-transparent px-4 py-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50 transition-all">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <input
                  id={usernameId}
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
              <label className="block mb-2 text-xs font-semibold text-muted-foreground">邮箱</label>
              <div className="flex items-center gap-3 rounded-xl border border-input bg-transparent px-4 py-3">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <span className="flex-1 truncate text-sm text-foreground">{user.email}</span>
                <span className="shrink-0 text-micro text-muted-foreground">登录与通知</span>
              </div>
            </div>

            <div>
              <label htmlFor={bioId} className="block mb-2 text-xs font-semibold text-muted-foreground">
                个人简介
              </label>
              <div className="rounded-xl border border-input bg-transparent px-4 py-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50 transition-all">
                <Textarea
                  id={bioId}
                  variant="ghost"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="介绍一下自己吧…（选填）"
                  maxLength={200}
                  rows={4}
                  className="resize-none px-0 py-0 text-sm"
                />
                <p className="mt-1 text-right text-micro text-muted-foreground">{bio.length}/200</p>
              </div>
            </div>
          </section>

          {/* 账号安全 */}
          <section className="rounded-2xl bg-card border border-border p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="text-sm font-semibold text-foreground">账号安全</h2>
              <span className="text-micro text-muted-foreground">不想改的话留空就好~</span>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor={oldPwId} className="block mb-2 text-xs font-medium text-muted-foreground">当前密码</label>
                <div className="flex items-center gap-3 rounded-xl border border-input bg-transparent px-4 py-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50 transition-all">
                  <input
                    id={oldPwId}
                    type={showOld ? "text" : "password"}
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="输入当前密码"
                    autoComplete="current-password"
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
                <label htmlFor={newPwId} className="block mb-2 text-xs font-medium text-muted-foreground">新密码</label>
                <div className="flex items-center gap-3 rounded-xl border border-input bg-transparent px-4 py-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50 transition-all">
                  <input
                    id={newPwId}
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="设置新密码（至少6位）"
                    autoComplete="new-password"
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
          </section>

          {/* 保存 */}
          <div className="rounded-2xl bg-card border border-border p-6 sm:p-8">
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
              {saving ? "保存中…" : "保存修改"}
            </button>
          </div>
        </main>
      </div>
    </form>
  )
}
