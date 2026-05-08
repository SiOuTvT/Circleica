"use client"

import { Languages, Loader2 } from "lucide-react";
import { useState } from "react";

/**
 * 一键翻译按钮
 * 使用 Google Translate 免费 API 将英文翻译为中文
 */
export function TranslateBtn({ text, onTranslated }: { text: string; onTranslated: (translated: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function translate() {
    setLoading(true)
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 5000) }),
      })
      const data = await res.json()
      if (data.translated) {
        onTranslated(data.translated)
        setDone(true)
      } else {
        console.error("翻译失败:", data.error)
      }
    } catch (err) {
      console.error("翻译失败:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={translate}
      disabled={loading || done}
      className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 light:bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-300 light:text-zinc-600 ring-1 ring-white/[0.08] light:ring-black/[0.08] transition-all hover:bg-zinc-700 light:hover:bg-zinc-200 hover:text-white light:hover:text-zinc-900 disabled:opacity-50"
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