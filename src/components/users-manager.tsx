"use client"

import { KeyRound, Link2, Loader2, Shield, ShieldOff, Copy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ROLE_META, type UserRole } from "@/lib/permissions"
import Image from "next/image"
import React, { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface UserItem {
  id: string; username: string; email: string; role: string
  avatar: string; createdAt: string
  _count: { favorites: number; comments: number; checkIns: number }
}

// 角色展示统一使用 @/lib/permissions 的 ROLE_META

export function UsersManager({ initialUsers }: { initialUsers: UserItem[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [resetId, setResetId] = useState<string | null>(null)
  const [newPwd, setNewPwd] = useState("")
  const [saving, setSaving] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [roleConfirm, setRoleConfirm] = useState<{id: string, current: string} | null>(null)

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
        toast.success("密码已重置")
        setResetId(null)
        setNewPwd("")
      } else {
        const d = await res.json()
        toast.error(d.error || "操作失败")
      }
    } catch {
      toast.error("网络错误")
    } finally {
      setSaving(false)
    }
  }

  async function generateResetLink(id: string) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "POST" })
      const data = await res.json()
      if (res.ok) setResetLink(data.resetUrl)
      else toast.error(data.error || "操作失败")
    } catch {
      toast.error("网络错误")
    }
  }

  async function confirmRoleChange() {
    if (!roleConfirm) return
    const { id, current } = roleConfirm
    let role: string
    if (current === "USER") role = "ADMIN"
    else if (current === "ADMIN") role = "USER"
    else { setRoleConfirm(null); return }

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        setUsers(p => p.map(u => u.id === id ? { ...u, role } : u))
        toast.success(`已${role === "ADMIN" ? "设为管理员" : "撤销管理员"}`)
      } else {
        const d = await res.json()
        toast.error(d.error || "操作失败")
      }
    } catch {
      toast.error("网络错误")
    }
    setRoleConfirm(null)
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("已复制到剪贴板")
    } catch {
      toast.error("复制失败")
    }
  }

  return (
    <div className="space-y-3">
      {/* 重置链接卡片 */}
      {resetLink && (
        <div className="rounded-xl bg-card p-4 ring-1 ring-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">密码重置链接</p>
            <Badge variant="secondary" size="sm">24小时有效</Badge>
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
          <p className="text-xs text-muted-foreground">将此链接发给用户，点击后可设置新密码</p>
        </div>
      )}

      {/* 用户表格 */}
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
        <div className="overflow-x-auto">
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
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  暂无用户数据
                </td>
              </tr>
            ) : users.map(u => {
              const roleCfg = ROLE_META[u.role as UserRole]
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
                          <p className="text-xs text-muted-foreground sm:hidden truncate max-w-[120px]">{u.email}</p>
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
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleCfg.className}`}>
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
                            onClick={() => setRoleConfirm({id: u.id, current: u.role})}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                              u.role === "ADMIN"
                                ? "text-red-400 hover:bg-red-500/10"
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
      <ConfirmDialog
        open={!!roleConfirm}
        onOpenChange={v => !v && setRoleConfirm(null)}
        title={roleConfirm?.current === "ADMIN" ? "撤销管理员" : "设为管理员"}
        description={roleConfirm?.current === "ADMIN" ? "确定要撤销该用户的管理员权限吗？" : "确定要将该用户设为管理员吗？"}
        confirmText="确定"
        onConfirm={confirmRoleChange}
      />
    </div>
  )
}
