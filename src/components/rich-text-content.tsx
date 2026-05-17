"use client"

import DOMPurify from "isomorphic-dompurify"

/** 渲染富文本 HTML 内容（已净化，防 XSS） */
export function RichTextContent({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "a", "img",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "blockquote", "code", "pre",
      "hr", "div", "span", "table", "thead", "tbody", "tr", "th", "td",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "target", "rel",
      "class", "style", "width", "height",
    ],
    ALLOW_DATA_ATTR: false,
  })

  return (
    <div
      className="prose prose-invert prose-sm max-w-none break-words
        prose-p:my-1 prose-a:text-zinc-300 prose-a:underline prose-a:underline-offset-2
        prose-img:rounded-lg prose-img:max-w-full
        prose-headings:text-zinc-200 prose-headings:mt-3 prose-headings:mb-1
        prose-ul:list-disc prose-ol:list-decimal prose-li:my-0.5"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
