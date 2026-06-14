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
    <div dangerouslySetInnerHTML={{ __html: clean }} />
  )
}
