"use client"

import DOMPurify from "isomorphic-dompurify"

interface IntroTabProps {
  description: string | null
}

export function IntroTab({ description }: IntroTabProps) {
  if (!description) {
    return <p className="text-sm text-muted-foreground/60 italic">暂无简介</p>
  }

  return (
    <div
      className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed"
      style={{ fontSize: "14px", lineHeight: "1.85" }}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(description, {
          ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "a", "img", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "code", "pre", "hr", "div", "span", "table", "thead", "tbody", "tr", "th", "td"],
          ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "class", "style", "width", "height"],
          ALLOW_DATA_ATTR: false,
        }),
      }}
    />
  )
}