"use client"

import DOMPurify from "isomorphic-dompurify"
import Image from "next/image"

export function IntroTab({
  description,
  allDescriptions,
  creators,
}: {
  description: string
  allDescriptions?: { lang: string; label: string; text: string }[]
  creators: {
    id: string
    role: string
    name: string
    avatar?: string | null
    nameJa?: string | null
    aliases?: string[]
  }[]
}) {
  return (
    <div role="tabpanel" id="tabpanel-intro" aria-labelledby="tab-intro">
      {allDescriptions && allDescriptions.length > 0 ? (
        <div className="space-y-5">
          {allDescriptions.map((d, idx) => (
            <div key={d.lang}>
              {allDescriptions.length > 1 && (
                <div className="mb-2">
                  <span
                    className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      background: "rgba(var(--theme-r), var(--theme-g), var(--theme-b), 0.1)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {d.label}
                  </span>
                </div>
              )}
              <div
                className="prose prose-invert max-w-none leading-relaxed"
                style={{ fontSize: "15px", lineHeight: "1.9", color: "var(--foreground)" }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(d.text, {
                    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "a", "img", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "code", "pre", "hr", "div", "span"],
                    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "class"],
                    ALLOW_DATA_ATTR: false,
                  }),
                }}
              />
              {idx < allDescriptions.length - 1 && (
                <div className="mt-4 border-t border-border/50" />
              )}
            </div>
          ))}
        </div>
      ) : description ? (
        <div
          className="prose prose-invert max-w-none leading-relaxed"
          style={{ fontSize: "15px", lineHeight: "1.9", color: "var(--foreground)" }}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(description, {
              ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "a", "img", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "code", "pre", "hr", "div", "span"],
              ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "class"],
              ALLOW_DATA_ATTR: false,
            }),
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground/60 italic">暂无简介</p>
      )}

      {/* 制作人员网格 */}
      {creators.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">制作人员</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {creators.map((c) => (
              <a
                key={`${c.id}-${c.role}`}
                href={`/creators/${c.id}`}
                className="flex items-center gap-2.5 rounded-xl bg-card p-3 ring-1 ring-border transition-all hover:ring-primary/40 hover:shadow-sm"
              >
                {c.avatar ? (
                  <Image
                    src={c.avatar}
                    alt={c.name}
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {(c.nameJa || c.name)[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{c.nameJa || c.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {{ scenario: "脚本", art: "原画", chardesign: "角色设计", director: "导演", music: "音乐", songs: "主题曲" }[c.role] ?? c.role}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}