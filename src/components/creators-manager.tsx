"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Plus, Trash2, Loader2, Download, Pencil, X, ExternalLink } from "lucide-react"

interface Creator {
  id: string; vndbId: string; name: string; nameJa: string
  avatar: string; bio: string; gender: string
  twitterUrl: string; wikipediaUrl: string
  _count: { games: number }
}

const EMPTY = { vndbId: "", name: "", nameJa: "", avatar: "", bio: "", gender: "", twitterUrl: "", wikipediaUrl: "" }
const inputCls = "w-full rounded-xl bg-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 ring-1 ring-white/[0.06] outline-none focus:ring-zinc-600 transition-all"

export function CreatorsManager({ initialCreators }: { initialCreators: Creator[] }) {
  const [creators, setCreators] = useState(initialCreators)
  const [form, setForm]         = useState(EMPTY)
  const [editId, setEditId]     = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState("")

  function set(k: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  // 从 VNDB 拉取
  async function fetchFromVndb() {
    if (!form.vndbId.trim()) return
    setFetching(true); setError("")
    const res  = await fetch(`/api/admin/creators/vndb?id=${form.vndbId.trim()}`)
    const data = await res.json()
    setFetching(false)
    if (!res.ok) { setError(data.error); return }
    setForm(f => ({ ...f, ...data }))
  }

  function openNew() {
    setForm(EMPTY); setEditId(null); setShowForm(true); setError("")
  }

  function openEdit(c: Creator) {
    setForm({ vndbId: c.vndbId, name: c.name, nameJa: c.nameJa, avatar: c.avatar,
      bio: c.bio, gender: c.gender, twitterUrl: c.twitterUrl, wikipediaUrl: c.wikipediaUrl })
    setEditId(c.id); setShowForm(true); setError("")
  }

  async function save() {
    if (!form.name.trim()) { setError("名字不能为空"); return }
    setSaving(true); setError("")
    const url    = editId ? `/api/admin/creators/${editId}` : "/api/admin/creators"
    const method = editId ? "PUT" : "POST"
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const data   = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }

    if (editId) {
      setCreators(p => p.map(c => c.id === editId ? { ...c, ...data } : c))
    } else {
      setCreators(p => [{ ...data, _count: { games: 0 } }, ...p])
    }
    setShowForm(false); setForm(EMPTY); setEditId(null)
  }

  async function remove(id: string) {
    await fetch(`/api/admin/creators/${id}`, { method: "DELETE" })
    setCreators(p => p.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openNew}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-300 ring-1 ring-white/[0.06] transition-all hover:bg-zinc-700 hover:text-white">
          <Plus className="h-4 w-4" strokeWidth={1.5} />新增创作者
        </button>
      </div>

      {/* 表单 */}
      {showForm && (
        <div className="rounded-xl bg-zinc-900 p-5 ring-1 ring-white/[0.06] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">{editId ? "编辑创作者" : "新增创作者"}</h2>
            <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* VNDB 一键拉取 */}
          <div className="flex gap-2">
            <input value={form.vndbId} onChange={set("vndbId")} placeholder="VNDB Staff ID（如 s1、s2）" className={inputCls} />
            <button onClick={fetchFromVndb} disabled={fetching || !form.vndbId.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-all hover:bg-zinc-600 disabled:opacity-50">
              {fetching ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Download className="h-4 w-4" strokeWidth={1.5} />}
              {fetching ? "拉取中…" : "从 VNDB 拉取"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">英文名 *</label>
              <input value={form.name} onChange={set("name")} placeholder="Nasu Kinoko" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">日文名</label>
              <input value={form.nameJa} onChange={set("nameJa")} placeholder="奈須きのこ" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">头像 URL</label>
            <input value={form.avatar} onChange={set("avatar")} placeholder="https://..." className={inputCls} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">简介</label>
            <textarea value={form.bio} onChange={set("bio")} rows={4} placeholder="简介…"
              className={`${inputCls} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Twitter URL</label>
              <input value={form.twitterUrl} onChange={set("twitterUrl")} placeholder="https://x.com/..." className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Wikipedia URL</label>
              <input value={form.wikipediaUrl} onChange={set("wikipediaUrl")} placeholder="https://..." className={inputCls} />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="gradient-accent flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
              {saving ? "保存中…" : editId ? "保存修改" : "创建"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="rounded-xl bg-zinc-800 px-5 py-2 text-sm text-zinc-400 ring-1 ring-white/[0.06] hover:text-zinc-200">
              取消
            </button>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/[0.06]">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <p className="text-xs text-zinc-500">共 {creators.length} 位创作者</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {creators.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-zinc-600">暂无创作者，点击右上角新增</p>
          )}
          {creators.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors">
              {c.avatar ? (
                <Image src={c.avatar} alt={c.name} width={36} height={36} className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-500 text-sm font-bold text-white">
                  {(c.nameJa || c.name)[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{c.nameJa || c.name}</p>
                <p className="text-[10px] text-zinc-600">{c.vndbId && `VNDB: ${c.vndbId} · `}{c._count.games} 部作品</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link href={`/creators/${c.id}`} target="_blank"
                  className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-300">
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Link>
                <button onClick={() => openEdit(c)}
                  className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-300">
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <button onClick={() => remove(c.id)}
                  className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
