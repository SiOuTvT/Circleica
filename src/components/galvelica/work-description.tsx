"use client"

import { useState } from "react"
import { RichTextContent } from "@/components/rich-text-content"
import { TranslateBtn } from "@/components/translate-btn"

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** 仅当正文以拉丁字母为主（基本是英文）时才提示翻译，避免中文资料冗余出现按钮。 */
function isMostlyNonCjk(text: string): boolean {
  const cjk = (text.match(/[一-鿿]/g) || []).length
  const latin = (text.match(/[a-zA-Z]/g) || []).length
  if (latin === 0) return false
  return cjk / (latin + cjk) < 0.15
}

export function GalvelicaWorkDescription({ html }: { html: string }) {
  const [translated, setTranslated] = useState<string | null>(null)
  const plain = stripHtml(html)
  const showBtn = isMostlyNonCjk(plain)

  return (
    <div>
      <RichTextContent html={html} className="max-w-3xl text-[15px] leading-relaxed text-foreground/90" />
      {showBtn && !translated && (
        <div className="mt-3">
          <TranslateBtn text={plain} onTranslated={setTranslated} />
        </div>
      )}
      {translated && (
        <div className="mt-4 rounded-xl border border-border bg-card/50 p-4">
          <div className="mb-1.5 text-xs font-semibold text-muted-foreground">中文翻译</div>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{translated}</p>
        </div>
      )}
    </div>
  )
}
