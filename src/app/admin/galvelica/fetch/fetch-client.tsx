"use client"

import { useState } from "react"
import { Download, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/** 源分类：与后端 routes/api/admin/galvelica/fetch 保持一致（仅海外源） */
type SourceKey = "VNDB" | "EROGESCAPE" | "STEAM" | "DLSITE" | "GETCHU" | "FUWANOVEL" | "BOOTH"

const SOURCES: { key: SourceKey; label: string; note: string }[] = [
  { key: "VNDB", label: "VNDB", note: "国际视觉小说库（主源，自动增量）" },
  { key: "STEAM", label: "Steam", note: "商店源（发现层）" },
  { key: "EROGESCAPE", label: "ErogameScape", note: "日本 galge 库，需服务器出口代理" },
  { key: "DLSITE", label: "DLsite", note: "抓取型（手动补查，R-18 注意）" },
  { key: "GETCHU", label: "Getchu", note: "抓取型（手动补查）" },
  { key: "FUWANOVEL", label: "Fuwanovel", note: "抓取型（手动补查）" },
  { key: "BOOTH", label: "Pixiv BOOTH", note: "抓取型·需 Pixiv token" },
]

interface FetchResult {
  message: string
  created: number
  skipped: number
  filtered: number
  failed: number
  results: { source: string; externalId: string; status: string; reason?: string; workId?: string }[]
}

export function GalvelicaFetchClient() {
  const [selected, setSelected] = useState<SourceKey[]>(["VNDB"])
  const [idsText, setIdsText] = useState("")
  const [doujinOnly, setDoujinOnly] = useState(true)
  const [overwrite, setOverwrite] = useState(false)
  const [maxDurationSec, setMaxDurationSec] = useState(120)
  const [maxItems, setMaxItems] = useState(50)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FetchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggleSource = (key: SourceKey) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const run = async () => {
    setError(null)
    setResult(null)
    const ids = idsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (selected.length === 0) {
      setError("请至少选择一个拉取源")
      return
    }
    if (ids.length === 0) {
      setError("请至少填写一个作品 ID")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/galvelica/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: selected,
          ids,
          doujinOnly,
          overwrite,
          maxDurationSec,
          maxItems,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error?.message || data?.message || "拉取失败")
      } else {
        setResult(data as FetchResult)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const statusColor = (status: string) => {
    if (status === "created") return "text-emerald-500"
    if (status === "skipped") return "text-muted-foreground"
    if (status === "filtered") return "text-amber-500"
    return "text-destructive"
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 源选择 */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">拉取源</h3>
        <p className="mt-1 text-xs text-muted-foreground">以下为已接入的海外数据源；国内源已按计划彻底移除，不再提供任何入口。</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map((s) => {
            const on = selected.includes(s.key)
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSource(s.key)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                  on ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30",
                )}
              >
                <span className={cn("mt-0.5 flex h-4 w-4 items-center justify-center rounded border", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                  {on && <CheckCircle2 className="h-3 w-3" />}
                </span>
                <span>
                  <span className="block text-sm font-medium text-foreground">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.note}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ID 输入 */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">作品 ID</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          每行一个外部 ID（VNDB 支持 <code className="rounded bg-muted px-1">v12345</code> 或 <code className="rounded bg-muted px-1">12345</code>）。ID 会作用于所有已选源，通常一次只选一个源。
        </p>
        <textarea
          value={idsText}
          onChange={(e) => setIdsText(e.target.value)}
          placeholder={"v3945\nv17\nv12345"}
          rows={6}
          className="mt-3 w-full rounded-lg border border-border bg-background p-3 font-mono text-sm text-foreground outline-none focus:border-primary/50"
        />
      </section>

      {/* 控制项 */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">拉取控制</h3>
        <div className="mt-3 flex flex-col gap-4">
          <label className="flex items-center gap-3 text-sm text-foreground">
            <input type="checkbox" checked={doujinOnly} onChange={(e) => setDoujinOnly(e.target.checked)} className="h-4 w-4 accent-primary" />
            定向同人（仅 VNDB：自动过滤非同人作品）
          </label>
          <label className="flex items-center gap-3 text-sm text-foreground">
            <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="h-4 w-4 accent-primary" />
            覆盖已存在（默认关闭 = 重复自动跳过，去重）
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">拉取时长上限（秒）</label>
              <input
                type="number"
                min={10}
                max={600}
                value={maxDurationSec}
                onChange={(e) => setMaxDurationSec(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">最大拉取条数</label>
              <input
                type="number"
                min={1}
                max={500}
                value={maxItems}
                onChange={(e) => setMaxItems(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground outline-none focus:border-primary/50"
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {loading ? "拉取中…" : "开始拉取"}
        </button>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {result && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-medium text-foreground">{result.message}</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="新建" value={result.created} />
            <Stat label="跳过(已存在)" value={result.skipped} />
            <Stat label="过滤(非同人)" value={result.filtered} />
            <Stat label="失败" value={result.failed} />
          </div>
          {result.results.length > 0 && (
            <div className="mt-4 max-h-80 overflow-x-auto overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">源</th>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground">{r.source}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.externalId}</td>
                      <td className={cn("px-3 py-2 font-medium", statusColor(r.status))}>{r.status}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.reason || (r.workId ? `work:${r.workId.slice(0, 8)}` : "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xl font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
