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
      className="space-y-6
        [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:text-foreground [&>h2]:mb-3
        [&>p]:text-sm [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>p]:mb-4
        [&>ul]:space-y-2 [&>ul]:text-sm [&>ul]:text-muted-foreground [&>ul]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-5
        [&>ol]:space-y-2 [&>ol]:text-sm [&>ol]:text-muted-foreground [&>ol]:leading-relaxed [&>ol]:list-decimal [&>ol]:pl-5
        [&>li]:mb-0
        [&>a]:text-primary [&>a]:underline [&>a]:underline-offset-2 [&>a]:hover:text-primary/80
        [&>strong]:font-semibold [&>strong]:text-foreground
      "
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
