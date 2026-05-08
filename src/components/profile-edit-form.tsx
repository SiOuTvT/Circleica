"use client"

import { ImageUpload } from "@/components/image-upload"
import type { OurFileRouter } from "@/lib/uploadthing"
import { ArrowLeft, Eye, EyeOff, FileText, Loader2, Lock, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { genUploader } from "uploadthing/client"

const { uploadFiles } = genUploader<OurFileRouter>()

interface Props {
  user: { id: string; username: string; bio: string; avatar: string; banner: string }
}

export function ProfileEditForm({ user }: Props) {
  const router = useRouter()

  const [username, setUsername]     = useState(user.username)
  const [bio, setBio]               = useState(user.bio)
  const [avatarData, setAvatarData] = useState(user.avatar)
  const [oldPassword, setOldPassword]   = useState("")
  const [newPassword, setNewPassword]   = useState("")
  const [showOld, setShowOld]       = useState(false)
  const [showNew, setShowNew]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState("")
  const [success, setSuccess]       = useState("")

  // 头像：使用 UploadThing 上传
  async function handleAvatarUpload(file: File): Promise<string> {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("头像图片不能超过 2MB")
    }
    const res = await uploadFiles("avatar", { files: [file] })
    if (!res?.[0]?.url) throw new Error("上传失败")
    return res[0].url
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

    if (!res.ok) { setError(data.error); return }
    setSuccess("保存成功！")
    setOldPassword("")
    setNewPassword("")
    setTimeout(() => router.push(`/profile/${user.id}`), 800)
  }

  const inputCls = "flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
  const fieldCls = "flex items-center gap-3 rounded-xl bg-zinc-800 px-4 py-3 ring-1 ring-white/[0.06] focus-within:ring-zinc-600 transition-all"

  return (
    <div className="rounded-2xl bg-zinc-900 p-6 ring-1 ring-white/[0.06]">
      <Link href={`/profile/${user.id}`} className="mb-5 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />返回主页
      </Link>

      {error   && <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400 ring-1 ring-emerald-500/20">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 头像上传 - 拖拽+裁剪 */}
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">头像</p>
        <ImageUpload
          value={avatarData}
          onChange={setAvatarData}
          uploadFunction={handleAvatarUpload}
          aspectRatio={1}
          maxSizeMB={5}
          shape="circle"
          placeholder="上传头像"
        />
          <p className="mt-1.5 text-[10px] text-zinc-600">支持 JPG/PNG/WebP，最大 2MB，可拖动调整位置和缩放</p>
        </div>

        {/* 用户名 */}
        <div className={fieldCls}>
          <User className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.5} />
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" maxLength={20} required className={inputCls} />
        </div>

        {/* 简介 */}
        <div className="flex gap-3 rounded-xl bg-zinc-800 px-4 py-3 ring-1 ring-white/[0.06] focus-within:ring-zinc-600 transition-all">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.5} />
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="个人简介（选填）" maxLength={200} rows={3} className="flex-1 resize-none bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none" />
        </div>

        {/* 修改密码 */}
        <div className="space-y-2 rounded-xl bg-zinc-800/50 p-4 ring-1 ring-white/[0.04]">
          <p className="text-xs font-medium text-zinc-500">修改密码（不修改留空）</p>
          <div className={fieldCls}>
            <Lock className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.5} />
            <input type={showOld ? "text" : "password"} value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="当前密码" className={inputCls} />
            <button type="button" onClick={() => setShowOld(v => !v)} className="text-zinc-600 hover:text-zinc-400">
              {showOld ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          </div>
          <div className={fieldCls}>
            <Lock className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.5} />
            <input type={showNew ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="新密码（至少6位）" className={inputCls} />
            <button type="button" onClick={() => setShowNew(v => !v)} className="text-zinc-600 hover:text-zinc-400">
              {showNew ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="gradient-accent flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
          {(saving) && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
          {saving ? "保存中…" : "保存修改"}
        </button>
      </form>
    </div>
  )
}
