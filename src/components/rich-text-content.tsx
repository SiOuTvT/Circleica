"use client"

/** 渲染富文本 HTML 内容 */
export function RichTextContent({ html }: { html: string }) {
  return (
    <div
      className="prose prose-invert prose-sm max-w-none break-words
        prose-p:my-1 prose-a:text-zinc-300 prose-a:underline prose-a:underline-offset-2
        prose-img:rounded-lg prose-img:max-w-full
        prose-headings:text-zinc-200 prose-headings:mt-3 prose-headings:mb-1
        prose-ul:list-disc prose-ol:list-decimal prose-li:my-0.5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}