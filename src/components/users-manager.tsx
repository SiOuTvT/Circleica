"use client"

import { KeyRound, Link2, Loader2, Shield, ShieldOff, Copy, X } from "lucide-react"
import Image from "next/image"
import React, { useState, useCallback } from "react"

interface UserItem {
  id: string; username: string; email: string; role: string
  avatar: string; createdAt: string
  _count: { favorites: number; comments: number; checkIns: number }
}

// ── 角色配置 ──
const ROLE_CONFIG = {
  SUPER_ADMIN: { label: "站长", className: "bg-amber-500/15 text-amber-600 light:text-amber-700 ring-1 ring-amber-500/20" },
  ADMIN: { label: "管理员", className: "bg-blue-500/15 text-blue-600 light:text-blue-700 ring-1 ring-blue-500/20" },
  USER: { label: "用户", className: "bg-zinc-500/10 text-zinc-500 ring-1 ring-zinc-500/15" },
} as const

function getRoleConfig(role: string) {
  return ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.USER
}

// ── 消息类型 ──
type MsgType = "success" | "error" | "info"
interface FlashMsg { text: string; type: MsgType }

export function UsersManager({ initialUsers }: { initialUsers: UserItem[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [resetId, setResetId] = useState<string | null>(null)
  const [newPwd, setNewPwd] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<FlashMsg | null>(null)
  const [resetLink, setResetLink] = useState<string | null>(null)

  const flash = useCallback((text: string, type: MsgType = "success") => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }, [])

  async function resetPassword(id: string) {
    if (!newPwd.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPwd }),
      })
      if (res.ok) {
        flash("密码已重置", "success")
        setResetId(null)
        setNewPwd("")
      } else {
        const d = await res.json()
        flash(d.error || "操作失败", "error")
      }
    } catch {
      flash("网络错误", "error")
    } finally {
      setSaving(false)
    }
  }

  async function generateResetLink(id: string) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "POST" })
      const data = await res.json()
      if (res.ok) setResetLink(data.resetUrl)
      else flash(data.error || "操作失败", "error")
    } catch {
      flash("网络错误", "error")
    }
  }

  async function toggleRole(id: string, current: string) {
    let role: string
    if (current === "USER") role = "ADMIN"
    else if (current === "ADMIN") role = "USER"
    else { flash("站长角色不能通过此按钮修改", "error"); return }

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        setUsers(p => p.map(u => u.id === id ? { ...u, role } : u))
        flash(`已${role === "ADMIN" ? "设为管理员" : "撤销管理员"}`, "success")
      } else {
        const d = await res.json()
        flash(d.error || "操作失败", "error")
      }
    } catch {
      flash("网络错误", "error")
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      flash("已复制到剪贴板", "success")
    } catch {
      flash("复制失败", "error")
    }
  }

  const msgStyles = {
    success: "bg-emerald-500/10 text-emerald-600 light:text-emerald-700 ring-emerald-500/20",
    error: "bg-red-500/10 text-red-600 light:text-red-700 ring-red-500/20",
    info: "bg-blue-500/10 text-blue-600 light:text-blue-700 ring-blue-500/20",
  }

  return (
    <div className="space-y-3">
      {/* 消息提示 */}
      {msg && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ring-1 ${msgStyles[msg.type]}`}>
          {msg.text}
        </div>
      )}

      {/* 重置链接卡片 */}
      {resetLink && (
        <div className="rounded-xl bg-card p-4 ring-1 ring-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">密码重置链接</p>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">24小时有效</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground font-mono break-all">
              {resetLink}
            </code>
            <button
              onClick={() => copyToClipboard(resetLink)}
              className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Copy className="h-3 w-3" />
              复制
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">将此链接发给用户，点击后可设置新密码</p>
        </div>
      )}

      {/* 用户表格 */}
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">用户</th>
              <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground sm:table-cell">邮箱</th>
              <th className="hidden px-4 py-3 text-xs font-medium text-muted-foreground md:table-cell">数据</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">角色</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(u => {
              const roleCfg = getRoleConfig(u.role)
              return (
                <React.Fragment key={u.id}>
                  <tr className="group hover:bg-accent/30 transition-colors">
                    {/* 用户信息 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-primary/80 ring-2 ring-background">
                          {u.avatar
                            ? <Image src={u.avatar} alt="" width={32} height={32} className="h-full w-full object-cover" />
                            : <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">{u.username[0].toUpperCase()}</div>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[120px]">{u.username}</p>
                          <p className="text-[11px] text-muted-foreground sm:hidden truncate max-w-[120px]">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* 邮箱 */}
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </td>

                    {/* 数据统计 */}
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-foreground">{u._count.favorites}</span> 收藏
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-foreground">{u._count.comments}</span> 评论
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium text-foreground">{u._count.checkIns}</span> 签到
                        </span>
                      </div>
                    </td>

                    {/* 角色标签 */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${roleCfg.className}`}>
                        {roleCfg.label}
                      </span>
                    </td>

                    {/* 操作按钮 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setResetId(resetId === u.id ? null : u.id); setNewPwd("") }}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="重置密码"
                        >
                          <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span className="hidden sm:inline">重置密码</span>
                        </button>
                        <button
                          onClick={() => generateResetLink(u.id)}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="生成重置链接"
                        >
                          <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span className="hidden sm:inline">生成链接</span>
                        </button>
                        {u.role !== "SUPER_ADMIN" && (
                          <button
                            onClick={() => toggleRole(u.id, u.role)}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                              u.role === "ADMIN"
                                ? "text-red-500 hover:bg-red-500/10"
                                : "text-blue-500 hover:bg-blue-500/10"
                            }`}
                            title={u.role === "ADMIN" ? "撤销管理员" : "设为管理员"}
                          >
                            {u.role === "ADMIN"
                              ? <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                              : <Shield className="h-3.5 w-3.5" strokeWidth={1.5} />}
                            <span className="hidden sm:inline">{u.role === "ADMIN" ? "撤销管理员" : "设为管理员"}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* 重置密码展开行 */}
                  {resetId === u.id && (
                    <tr className="bg-accent/20">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3 max-w-xl">
                          <label className="text-xs font-medium text-foreground shrink-0">新密码：</label>
                          <input
                            value={newPwd}
                            onChange={e => setNewPwd(e.target.value)}
                            placeholder="至少6位"
                            type="password"
                            autoFocus
                            className="flex-1 min-w-[200px] rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-border outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                          />
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => resetPassword(u.id)}
                              disabled={saving || !newPwd}
                              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                              确认重置
                            </button>
                            <button
                              onClick={() => setResetId(null)}
                              className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
