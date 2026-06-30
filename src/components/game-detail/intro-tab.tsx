"use client"

import DOMPurify from "isomorphic-dompurify"
import { Building2, Calendar, ChevronDown, Clock, ExternalLink, Gamepad2, Users } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { Tag } from "@/components/ui/tag"

/* ═══════════════════════════════════════════════
   IntroTab — 游戏简介 + 制作人员
   ═══════════════════════════════════════════════ */

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
      {/* 游戏简介 */}
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
                className="prose dark:prose-invert max-w-none leading-relaxed"
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
          className="prose dark:prose-invert max-w-none leading-relaxed"
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

      {/* 制作人员折叠卡片 — 与游戏档案统一风格 */}
      {creators.length > 0 && (
        <div className="mt-5">
          <CollapsibleCard
            icon={<Users className="h-4 w-4 opacity-60" />}
            label="制作人员"
            count={creators.length}
            defaultOpen={creators.length <= 5}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {creators.map((c) => (
                <a
                  key={`${c.id}-${c.role}`}
                  href={`/creators/${c.id}`}
                  className="flex items-center gap-2.5 rounded-xl bg-secondary/40 p-2.5 transition-all hover:bg-secondary/70"
                >
                  {c.avatar ? (
                    <Image
                      src={c.avatar}
                      alt={c.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
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
          </CollapsibleCard>
        </div>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════════
   ArchiveCard — 游戏档案折叠卡片（手机端）
   使用 CollapsibleCard 统一风格
   ═══════════════════════════════════════════════ */

export function ArchiveCard({
  releaseDate,
  studioName,
  gameDuration,
  vndbId,
  gameTags,
  isOpen,
  onToggle,
}: {
  releaseDate?: string
  studioName?: string
  gameDuration?: string
  vndbId?: string
  gameTags?: { name: string; color: string; groupName?: string }[]
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="mt-5 lg:hidden">
      <CollapsibleCard
        icon={<Calendar className="h-4 w-4 opacity-60" />}
        label="游戏档案"
        isOpen={isOpen}
        onToggle={onToggle}
      >
        <div className="space-y-2.5">
          {releaseDate && (
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs shrink-0 text-muted-foreground">发售日期</span>
              <span className="ml-auto text-xs font-semibold text-foreground">{releaseDate}</span>
            </div>
          )}
          {studioName && (
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs shrink-0 text-muted-foreground">制作会社</span>
              <span className="ml-auto inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold bg-secondary text-foreground">{studioName}</span>
            </div>
          )}
          {gameDuration && (
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs shrink-0 text-muted-foreground">游戏时长</span>
              <span className="ml-auto inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold bg-secondary text-foreground">{gameDuration}</span>
            </div>
          )}
          {vndbId && (() => {
            const rawId = vndbId.startsWith("v") ? vndbId : `v${vndbId}`
            const numericId = rawId.replace(/^v/, "")
            return (
              <div className="flex items-center gap-2.5">
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-xs shrink-0 text-muted-foreground">VNDB</span>
                <a href={`https://vndb.org/v${numericId}`} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-80 bg-secondary text-foreground">v{numericId}</a>
              </div>
            )
          })()}
          {gameTags && gameTags.length > 0 && (
            <div className="flex items-start gap-2.5">
              <Gamepad2 className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
                <span className="text-xs shrink-0 text-muted-foreground">游戏标签</span>
                {gameTags.map((tag, i) => (
                  <Tag
                    key={i}
                    color={tag.color || undefined}
                    href={`/games?tag=${encodeURIComponent(tag.name)}`}
                  >
                    {tag.name}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleCard>
    </div>
  )
}


/* ═══════════════════════════════════════════════
   CollapsibleCard — 统一折叠卡片组件
   制作人员、游戏档案共用此组件
   ═══════════════════════════════════════════════ */

function CollapsibleCard({
  icon,
  label,
  count,
  isOpen: controlledOpen,
  onToggle: controlledToggle,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode
  label: string
  count?: number
  isOpen?: boolean
  onToggle?: () => void
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = controlledOpen ?? internalOpen
  const toggle = controlledToggle ?? (() => setInternalOpen((v) => !v))

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-secondary/30 transition-colors"
      >
        {icon}
        <span className="text-[15px] font-semibold text-foreground">{label}</span>
        {count != null && (
          <span className="text-xs font-medium text-muted-foreground">({count})</span>
        )}
        <ChevronDown
          className="ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300 ease-out shrink-0"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* 内容区 — 条件渲染 + fade 动画 */}
      {isOpen && (
        <div className="border-t border-border px-4 py-3 animate-fade-in-up">
          {children}
        </div>
      )}
    </div>
  )
}
