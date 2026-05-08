"use client"

import { useState } from "react";
import { TranslateBtn } from "./translate-btn";

/**
 * 可翻译的描述区块
 * 显示原文描述，点击翻译按钮后显示中文翻译
 */
export function TranslatableDescription({ text, className = "" }: { text: string; className?: string }) {
  const [translated, setTranslated] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)

  const cleaned = text.replace(/\[url=[^\]]*\]([^[]*)\[\/url\]/g, "$1")

  return (
    <div className={className}>
      <p className="text-sm leading-relaxed text-zinc-400 light:text-zinc-600 whitespace-pre-line">
        {translated && !showOriginal ? translated : cleaned}
      </p>
      <div className="mt-3 flex items-center gap-2">
        {!translated && <TranslateBtn text={cleaned} onTranslated={setTranslated} />}
        {translated && (
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 light:bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-300 light:text-zinc-600 ring-1 ring-white/[0.08] light:ring-black/[0.08] transition-all hover:bg-zinc-700 light:hover:bg-zinc-200 hover:text-white light:hover:text-zinc-900"
          >
            {showOriginal ? "查看翻译" : "查看原文"}
          </button>
        )}
      </div>
    </div>
  )
}