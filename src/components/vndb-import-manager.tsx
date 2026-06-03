"use client"

import { useState } from "react"
import { Database, CheckCircle2, XCircle, Loader2 } from "lucide-react"

export function VNDBImportManager() {
  const [vndbIds, setVndbIds] = useState("")
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [message, setMessage] = useState("")

  async function handleImport() {
    if (!vndbIds.trim()) return

    setImporting(true)
    setMessage("")
    setResults([])

    try {
      const ids = vndbIds
        .split(/[\n,]/)
        .map(id => id.trim().replace(/^v/i, ""))
        .filter(id => /^\d+$/.test(id))

      if (ids.length === 0) {
        setMessage("❌ 未找到有效的 VNDB ID")
        setImporting(false)
        return
      }

      const res = await fetch("/api/admin/vndb/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vndbIds: ids }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage(`✅ ${data.message}`)
        setResults(data.results)
        setVndbIds("")
      } else {
        setMessage(`❌ ${data.error}`)
      }
    } catch (error) {
      setMessage("❌ 导入失败，请稍后重试")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="rounded-xl bg-card p-6 ring-1 ring-border">
      <div className="mb-4 flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" strokeWidth={2} />
        <h3 className="text-base font-semibold text-foreground">VNDB 批量导入</h3>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        输入 VNDB 视觉小说 ID（每行一个或用逗号分隔），系统将自动验证并导入同人作品。
        <br />
        示例：12345, 67890, 11111
      </p>

      <textarea
        value={vndbIds}
        onChange={(e) => setVndbIds(e.target.value)}
        placeholder="输入 VNDB ID..."
        rows={4}
        className="w-full resize-none rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all"
      />

      <button
        onClick={handleImport}
        disabled={importing || !vndbIds.trim()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {importing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            导入中…
          </>
        ) : (
          <>
            <Database className="h-4 w-4" strokeWidth={2} />
            开始导入
          </>
        )}
      </button>

      {message && (
        <div className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm text-foreground">
          {message}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground">导入结果：</p>
          {results.map((result, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg bg-secondary/50/50 px-3 py-2 text-xs"
            >
              {result.status === "success" && (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={2} />
              )}
              {result.status === "failed" && (
                <XCircle className="h-4 w-4 text-red-400" strokeWidth={2} />
              )}
              {result.status === "skipped" && (
                <span className="h-4 w-4 text-yellow-400 text-lg">⚠</span>
              )}
              <span className="text-muted-foreground">v{result.vndbId}</span>
              <span className="text-muted-foreground">-</span>
              <span
                className={
                  result.status === "success"
                    ? "text-emerald-400"
                    : result.status === "failed"
                    ? "text-red-400"
                    : "text-yellow-400"
                }
              >
                {result.status === "success"
                  ? "成功"
                  : result.status === "failed"
                  ? result.reason
                  : "已存在"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
