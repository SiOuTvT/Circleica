"use client"

import {
  AlertTriangle, CheckCircle2,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Search as SearchIcon,
  Sparkles,
  ToggleLeft, ToggleRight,
  Trash2, X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface EmMsg {
  id: string; key: string; category: string; title: string
  subtitle: string; imageUrl: string; emoji: string; enabled: boolean
}

const CATEGORY_META: Record<string, { label: string; icon: typeof Sparkles; color: string }> = {
  toast:   { label: "Toast 提示",  icon: MessageCircle, color: "text-primary" },
  empty:   { label: "空状态",      icon: SearchIcon,    color: "text-amber-400" },
  error:   { label: "错误页",      icon: AlertTriangle, color: "text-red-400" },
  success: { label: "成功页",      icon: CheckCircle2,  color: "text-emerald-400" },
}

const CATEGORIES = Object.keys(CATEGORY_META)

/* ── 预设种子数据 ── */
const SEED_DATA: Omit<EmMsg, "id">[] = [
  // Toast
  { key: "favorite_added",    category: "toast",   title: "收藏成功",     subtitle: "已加入你的收藏",       imageUrl: "", emoji: "❤️",   enabled: true },
  { key: "favorite_removed",  category: "toast",   title: "取消收藏",     subtitle: "已移出收藏夹",         imageUrl: "", emoji: "💔",   enabled: true },
  { key: "checkin_success",   category: "toast",   title: "签到成功",     subtitle: "今天也要开心哦",       imageUrl: "", emoji: "✅",   enabled: true },
  { key: "checkin_duplicate", category: "toast",   title: "已经签到过了", subtitle: "明天再来吧~",          imageUrl: "", emoji: "☀️",   enabled: true },
  { key: "follow_success",    category: "toast",   title: "关注成功",     subtitle: "将收到ta的动态通知",    imageUrl: "", emoji: "🤝",   enabled: true },
  { key: "unfollow_success",  category: "toast",   title: "取消关注",     subtitle: "已取消关注",           imageUrl: "", emoji: "👋",   enabled: true },
  { key: "comment_success",   category: "toast",   title: "评论成功",     subtitle: "你的评论已发布",       imageUrl: "", emoji: "💬",   enabled: true },
  // Empty
  { key: "empty_favorites",   category: "empty",   title: "收藏夹空空如也",   subtitle: "去探索好玩的游戏吧",       imageUrl: "", emoji: "💝",   enabled: true },
  { key: "empty_comments",    category: "empty",   title: "还没有评论",       subtitle: "来抢沙发吧~",             imageUrl: "", emoji: "🛋️",  enabled: true },
  { key: "empty_forum",       category: "empty",   title: "论坛暂时没有帖子", subtitle: "来发第一个帖子吧",         imageUrl: "", emoji: "📝",   enabled: true },
  { key: "empty_notifications", category: "empty", title: "暂无新通知",       subtitle: "有新动态时会通知你",       imageUrl: "", emoji: "🔔",   enabled: true },
  { key: "empty_play_status", category: "empty",   title: "游戏清单空空的",   subtitle: "添加想玩/在玩/玩过的游戏", imageUrl: "", emoji: "🎮",   enabled: true },
  // Error
  { key: "error_404",         category: "error",   title: "页面不存在",       subtitle: "你迷路了吗？",         imageUrl: "", emoji: "🫠",   enabled: true },
  { key: "error_500",         category: "error",   title: "服务器开小差了",   subtitle: "请稍后再试",           imageUrl: "", emoji: "🔧",   enabled: true },
  { key: "error_network",     category: "error",   title: "网络连接失败",     subtitle: "请检查网络设置",       imageUrl: "", emoji: "📡",   enabled: true },
  { key: "error_unauthorized",category: "error",   title: "请先登录",         subtitle: "登录后才能进行操作",   imageUrl: "", emoji: "🔒",   enabled: true },
  // Success
  { key: "success_register",  category: "success", title: "注册成功",         subtitle: "欢迎加入！",           imageUrl: "", emoji: "🎉",   enabled: true },
  { key: "success_profile",   category: "success", title: "资料更新成功",     subtitle: "你的个人资料已保存",   imageUrl: "", emoji: "✨",   enabled: true },
]

export function EmotionalMessagesManager({ initialItems }: { initialItems: EmMsg[] }) {
  const [items] = useState(initialItems)
  const [filter, setFilter] = useState<string>("all")
  const [editing, setEditing] = useState<EmMsg | null>(null)
  const [creating, setCreating] = useState(false)
  const [newItem, setNewItem] = useState({ key: "", category: "toast", title: "", subtitle: "", imageUrl: "", emoji: "" })
  const [pending, startTransition] = useTransition()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showSeedConfirm, setShowSeedConfirm] = useState(false)
  const router = useRouter()

  const filtered = filter === "all" ? items : items.filter(i => i.category === filter)

  /* ── 刷新服务端数据 ── */
  const refresh = () => startTransition(() => router.refresh())

  /* ── 创建 ── */
  const handleCreate = async () => {
    if (!newItem.key || !newItem.category) return
    const res = await fetch("/api/admin/emotional-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newItem, enabled: true }),
    })
    if (res.ok) {
      setCreating(false)
      setNewItem({ key: "", category: "toast", title: "", subtitle: "", imageUrl: "", emoji: "" })
      refresh()
    } else {
      const data = await res.json()
      toast.error(data.error || "创建失败")
    }
  }

  /* ── 更新 ── */
  const handleUpdate = async (item: EmMsg) => {
    await fetch(`/api/admin/emotional-messages/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    })
    setEditing(null)
    refresh()
  }

  /* ── 切换启用 ── */
  const toggleEnabled = async (item: EmMsg) => {
    await fetch(`/api/admin/emotional-messages/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !item.enabled }),
    })
    refresh()
  }

  /* ── 删除 ── */
  const handleDelete = async () => {
    if (!confirmDeleteId) return
    const res = await fetch(`/api/admin/emotional-messages/${confirmDeleteId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("已删除")
    } else {
      toast.error("删除失败")
    }
    setConfirmDeleteId(null)
    refresh()
  }

  /* ── 一键种子 ── */
  const handleSeed = async () => {
    for (const s of SEED_DATA) {
      await fetch("/api/admin/emotional-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      }).catch(() => {})
    }
    refresh()
  }

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "全部" },
          ...CATEGORIES.map(c => ({ key: c, label: CATEGORY_META[c].label })),
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${filter === f.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {f.label}
            {f.key !== "all" && (
              <span className="ml-1 opacity-60">{items.filter(i => i.category === f.key).length}</span>
            )}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {items.length === 0 && (
            <button onClick={() => setShowSeedConfirm(true)} disabled={pending}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-500 transition-all hover:bg-amber-500/20">
              <Sparkles className="h-3.5 w-3.5" /> 初始化预设
            </button>
          )}
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/20">
            <Plus className="h-3.5 w-3.5" /> 新增
          </button>
        </div>
      </div>

      {/* 创建表单 */}
      {creating && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">新增情感消息</p>
            <button onClick={() => setCreating(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Key (唯一标识)">
              <input value={newItem.key} onChange={e => setNewItem(p => ({ ...p, key: e.target.value }))} placeholder="如：favorite_added" className="em-input" />
            </Field>
            <Field label="分类">
              <select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))} className="em-input">
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
              </select>
            </Field>
            <Field label="Emoji">
              <input value={newItem.emoji} onChange={e => setNewItem(p => ({ ...p, emoji: e.target.value }))} placeholder="❤️" className="em-input" />
            </Field>
            <Field label="标题">
              <input value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} placeholder="收藏成功" className="em-input" />
            </Field>
            <Field label="副标题">
              <input value={newItem.subtitle} onChange={e => setNewItem(p => ({ ...p, subtitle: e.target.value }))} placeholder="已加入收藏" className="em-input" />
            </Field>
            <Field label="插图 URL (可选)">
              <input value={newItem.imageUrl} onChange={e => setNewItem(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." className="em-input" />
            </Field>
          </div>
          <button onClick={handleCreate} disabled={pending || !newItem.key}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40">
            <Save className="h-3.5 w-3.5" /> 保存
          </button>
        </div>
      )}

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <Sparkles className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {items.length === 0 ? "暂无消息，点击上方「初始化预设」快速添加" : "该分类暂无消息"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.toast
            const Icon = meta.icon
            const isEditing = editing?.id === item.id

            return (
              <div key={item.id}
                className={`group rounded-xl border bg-card p-4 transition-all ${item.enabled ? "border-border hover:border-primary/30" : "border-dashed border-muted-foreground/20 opacity-60"}`}>
                {isEditing ? (
                  /* ── 编辑模式 ── */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Field label="Key"><input value={editing!.key} onChange={e => setEditing(p => p && { ...p, key: e.target.value })} placeholder="如: tmrw" className="em-input" /></Field>
                      <Field label="分类">
                        <select value={editing!.category} onChange={e => setEditing(p => p && { ...p, category: e.target.value })} className="em-input">
                          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
                        </select>
                      </Field>
                      <Field label="Emoji"><input value={editing!.emoji} onChange={e => setEditing(p => p && { ...p, emoji: e.target.value })} placeholder="如: 🌅" className="em-input" /></Field>
                      <Field label="标题"><input value={editing!.title} onChange={e => setEditing(p => p && { ...p, title: e.target.value })} placeholder="如: 明天会更好" className="em-input" /></Field>
                      <Field label="副标题"><input value={editing!.subtitle} onChange={e => setEditing(p => p && { ...p, subtitle: e.target.value })} placeholder="鼓励语句" className="em-input" /></Field>
                      <Field label="插图 URL"><input value={editing!.imageUrl} onChange={e => setEditing(p => p && { ...p, imageUrl: e.target.value })} placeholder="https://..." className="em-input" /></Field>
                    </div>
                    {editing!.imageUrl && (
                      <Image src={editing!.imageUrl} alt="" width={80} height={80} className="h-20 w-20 rounded-lg object-cover ring-1 ring-border" unoptimized />
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(editing!)} disabled={pending}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
                        <Save className="h-3.5 w-3.5" /> 保存
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent">
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── 展示模式 ── */
                  <div className="flex items-center gap-4">
                    {/* Emoji / 图标 */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt="" width={48} height={48} className="h-full w-full rounded-lg object-cover" unoptimized />
                      ) : item.emoji ? (
                        <span>{item.emoji}</span>
                      ) : (
                        <Icon className={`h-6 w-6 ${meta.color}`} />
                      )}
                    </div>
                    {/* 文本 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{item.key}</span>
                        {!item.enabled && <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400">已禁用</span>}
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">{item.title || "—"}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle || "—"}</p>
                    </div>
                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleEnabled(item)} title={item.enabled ? "禁用" : "启用"}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-accent hover:text-foreground">
                        {item.enabled ? <ToggleRight className="h-4 w-4 text-emerald-400" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      <button onClick={() => setEditing(item)} title="编辑"
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-accent hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(item.id)} title="删除"
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={showSeedConfirm}
        onOpenChange={setShowSeedConfirm}
        title="初始化预设消息"
        description="将初始化全部预设情感消息（已存在的 key 会跳过），确定？"
        onConfirm={handleSeed}
      />

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null) }}
        title="删除情感消息"
        description="确定删除这条消息？删除后不可恢复。"
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}