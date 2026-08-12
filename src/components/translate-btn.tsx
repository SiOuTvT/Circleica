"use client"

import { Languages, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetchSafe } from "@/lib/api-client";

/**
 * 一键翻译按钮
 * 调用 /api/translate（MyMemory → LibreTranslate → Google 免费链路）将英文翻译为中文
 */
export function TranslateBtn({ text, onTranslated }: { text: string; onTranslated: (translated: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function translate() {
    if (!text?.trim()) return
    setLoading(true)
    try {
      // apiFetchSafe 返回的是完整响应体 { success, data: { translated } }，
      // 翻译结果在 data.data.translated（曾漏掉一层 .data 导致点击无反应）。
      const { data, error } = await apiFetchSafe<{
        data?: { translated?: string }
        error?: string
      }>("/api/translate", {
        method: "POST",
        body: { text: text.slice(0, 5000) },
      })
      if (data?.data?.translated) {
        onTranslated(data.data.translated)
        setDone(true)
      } else {
        toast.error(error || "翻译失败，请稍后重试")
      }
    } catch {
      toast.error("翻译失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={translate}
      disabled={loading || done}
      className="flex items-center gap-1.5 rounded-lg bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground disabled:opacity-50"
      title="将英文描述翻译为中文"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
      ) : (
        <Languages className="h-3.5 w-3.5" strokeWidth={2} />
      )}
      {done ? "已翻译" : "翻译为中文"}
    </button>
  )
}