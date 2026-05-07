"use client"

import { useState } from "react"
import React from "react"
import Image from "next/image"
import { Shield, ShieldOff, KeyRound, Loader2, Link2 } from "lucide-react"

interface UserItem {
  id: string; username: string; email: string; role: string
  avatar: string; createdAt: string
  _count: { favorites: number; comments: number; checkIns: number }
}

export function UsersManager({ initialUsers }: { initialUsers: UserItem[] }) {
  const [users, setUsers]         = useState(initialUsers)
  const [resetId, setResetId]     = useState<string | null>(null)
  const [newPwd, setNewPwd]       = useState("")
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState("")
  const [resetLink, setResetLink] = useState<string | null>(null)

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 4000) }

  async function resetPassword(id: string) {
    if (!newPwd.trim()) return
    setSaving(true)
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: newPwd }),
    })
    setSaving(false)
    if (res.ok) { flash("密码已重置"); setResetId(null); setNewPwd("") }
    else { const d = await res.json(); flash(d.error) }
  }

  async function generateResetLink(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "POST" })
    const data = await res.json()
    if (res.ok) setResetLink(data.resetUrl)
    else flash(data.error)
  }

  async function toggleRole(id: string, current: string) {
    const role = current === "ADMIN" ? "USER" : "ADMIN"
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    if (res.ok) setUsers(p => p.map(u => u.id === id ? { ...u, role } : u))
  }

  return (
    <div className="space-y-3">
      {msg && <div className="rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400 ring-1 ring-emerald-500/20">{msg}</div>}

      {/* 重置链接弹窗 */}
      {resetLink && (
        <div className="rounded-xl bg-zinc-800 p-4 ring-1 ring-white/[0.06] space-y-2">
          <p className="text-xs font-medium text-zinc-300">重置链接（24小时有效）</p>
          <div className="flex items-center gap-2">
            <input readOnly value={resetLink} className="flex-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-white/[0.06] outline-none" />
            <button onClick={() => { navigator.clipboard.writeText(resetLink); flash("已复制") }}
              className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-600">复制</button>
            <button onClick={() => setResetLink(null)} className="text-zinc-600 hover:text-zinc-400 text-xs">关闭</button>
          </div>
          <p className="text-[10px] text-zinc-600">将此链接发给用户，点击后可设置新密码</p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">用户</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">邮箱</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">数据</th>
              <th className="px-4 py-3 font-medium">角色</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {users.map(u => (
              <React.Fragment key={u.id}>
                <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-500">
                        {u.avatar
                          ? <Image src={u.avatar} alt="" width={28} height={28} className="h-full w-full object-cover" />
                          : <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">{u.username[0].toUpperCase()}</div>}
                      </div>
                      <span className="font-medium text-zinc-200">{u.username}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-zinc-500 sm:table-cell">{u.email}</td>
                  <td className="hidden px-4 py-3 text-xs text-zinc-600 md:table-cell">
                    收藏 {u._count.favorites} · 评论 {u._count.comments} · 签到 {u._count.checkIns}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${u.role === "ADMIN" ? "bg-blue-500/15 text-blue-400" : "bg-zinc-800 text-zinc-500"}`}>
                      {u.role === "ADMIN" ? "管理员" : "用户"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => { setResetId(resetId === u.id ? null : u.id); setNewPwd("") }}
                        className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 ring-1 ring-white/[0.06] transition-all hover:text-zinc-200">
                        <KeyRound className="h-3 w-3" strokeWidth={1.5} />重置密码
                      </button>
                      <button onClick={() => generateResetLink(u.id)}
                        className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 ring-1 ring-white/[0.06] transition-all hover:text-zinc-200">
                        <Link2 className="h-3 w-3" strokeWidth={1.5} />生成链接
                      </button>
                      <button onClick={() => toggleRole(u.id, u.role)}
                        className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 ring-1 ring-white/[0.06] transition-all hover:text-zinc-200">
                        {u.role === "ADMIN"
                          ? <ShieldOff className="h-3 w-3" strokeWidth={1.5} />
                          : <Shield className="h-3 w-3" strokeWidth={1.5} />}
                        {u.role === "ADMIN" ? "撤销管理员" : "设为管理员"}
                      </button>
                    </div>
                  </td>
                </tr>
                {resetId === u.id && (
                  <tr key={`${u.id}-reset`} className="bg-zinc-800/30">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 shrink-0">新密码：</span>
                        <input value={newPwd} onChange={e => setNewPwd(e.target.value)}
                          placeholder="至少6位" type="password"
                          className="flex-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 ring-1 ring-white/[0.06] outline-none focus:ring-zinc-600" />
                        <button onClick={() => resetPassword(u.id)} disabled={saving || !newPwd}
                          className="flex items-center gap-1 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition-all hover:bg-zinc-600 disabled:opacity-50">
                          {saving && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />}
                          确认
                        </button>
                        <button onClick={() => setResetId(null)} className="text-xs text-zinc-600 hover:text-zinc-400">取消</button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
