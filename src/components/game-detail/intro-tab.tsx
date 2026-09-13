"use client"

import { cn } from "@/lib/utils"
import { RichTextContent } from "@/components/rich-text-content-wrapper"
import { ChevronDown, Tags, Users } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { GameInfoList, VndbBadge, type GameInfoData } from "./game-info-list"
import { roleLabel } from "@/lib/role-labels"
import { Tag } from "@/components/ui/tag"

/* ═══════════════════════════════════════════════
   语言优先级：中文 > English > 日本語 > 其他
   ═══════════════════════════════════════════════ */
const LANG_PRIORITY = ["zh", "en", "ja", "other"]

function getDefaultLang(descriptions: { lang: string }[]): string {
  for (const lang of LANG_PRIORITY) {
    if (descriptions.some((d) => d.lang === lang)) return lang
  }
  return descriptions[0]?.lang ?? ""
}

/* ═══════════════════════════════════════════════
   语言导航 Tab — 下划线滑动指示器
   ═══════════════════════════════════════════════ */
function LangTabs({
  descriptions,
  activeLang,
  onChange,
}: {
  descriptions: { lang: string; label: string }[]
  activeLang: string
  onChange: (lang: string) => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  // 计算指示器位置
  useEffect(() => {
    if (!barRef.current) return
    const active = barRef.current.querySelector(`[data-lang="${activeLang}"]`) as HTMLElement | null
    if (active) {
      const bar = barRef.current
      setIndicator({
        left: active.offsetLeft - bar.scrollLeft,
        width: active.offsetWidth,
      })
      // 横向滚动到激活项
      const target = active.offsetLeft - bar.offsetWidth / 2 + active.offsetWidth / 2
      bar.scrollTo({ left: target, behavior: "smooth" })
    }
  }, [activeLang])

  // 监听滚动更新指示器位置
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const onScroll = () => {
      const active = bar.querySelector(`[data-lang="${activeLang}"]`) as HTMLElement | null
      if (active) {
        setIndicator({ left: active.offsetLeft - bar.scrollLeft, width: active.offsetWidth })
      }
    }
    bar.addEventListener("scroll", onScroll, { passive: true })
    return () => bar.removeEventListener("scroll", onScroll)
  }, [activeLang])

  return (
    <div className="relative">
      {/* Tab 栏 */}
      <div
        ref={barRef}
        className="flex items-center gap-5 overflow-x-auto scrollbar-hide pb-2.5"
        role="tablist"
        aria-label="简介语言切换"
      >
        {descriptions.map((d) => {
          const isActive = d.lang === activeLang
          return (
            <button
              key={d.lang}
              type="button"
              role="tab"
              data-lang={d.lang}
              aria-selected={isActive}
              onClick={() => onChange(d.lang)}
              className={cn(
                "inline-flex min-h-[28px] shrink-0 items-center text-sm font-medium transition-colors duration-150",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              {d.label}
            </button>
          )
        })}
      </div>

      {/* 滑动下划线指示器 */}
      <div
        className="absolute bottom-0 h-[2px] rounded-full bg-primary transition-all duration-200 ease-out"
        style={{
          left: indicator.left,
          width: indicator.width,
          opacity: indicator.width > 0 ? 1 : 0,
        }}
      />

      {/* 底部分割线 */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border/50" />
    </div>
  )
}

/* ═══════════════════════════════════════════════
   IntroTab — 游戏简介 + 制作人员
   ═══════════════════════════════════════════════ */

export function IntroTab({
  description,
  allDescriptions,
  creators,
  gameTags,
}: {
  description: string
  allDescriptions?: { lang: string; label: string; text: string }[]
  creators: {
    id: string
    slug?: string | null
    role: string
    name: string
    avatar?: string | null
    nameJa?: string | null
    aliases?: string[]
  }[]
  /** 游戏标签（已从档案卡迁出，颜色沿用后台标签组色） */
  gameTags?: { name: string; color: string; groupName?: string }[]
}) {
  const hasMultiple = allDescriptions && allDescriptions.length > 1
  const [activeLang, setActiveLang] = useState(() =>
    allDescriptions ? getDefaultLang(allDescriptions) : ""
  )
  const [fading, setFading] = useState(false)

  const switchLang = useCallback(
    (lang: string) => {
      if (lang === activeLang) return
      setFading(true)
      // 淡出 → 切换 → 淡入
      setTimeout(() => {
        setActiveLang(lang)
        setFading(false)
      }, 150)
    },
    [activeLang]
  )

  // 单语言或无 allDescriptions 时直接渲染
  if (!allDescriptions || allDescriptions.length === 0) {
    return (
      <div role="tabpanel" id="tabpanel-intro" aria-labelledby="tab-intro">
        {description ? (
          <RichTextContent html={description} className="prose dark:prose-invert max-w-[880px] text-[13px] sm:text-[15px] leading-[1.7] text-foreground prose-headings:font-[var(--font-heading)]" />
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">暂无简介</p>
        )}
        {creators.length > 0 && (
          <div className="mt-6">
            <CreatorsSection creators={creators} />
          </div>
        )}
        {gameTags && gameTags.length > 0 && (
          <div className="mt-6">
            <TagsSection tags={gameTags} />
          </div>
        )}
      </div>
    )
  }

  const activeDesc = allDescriptions.find((d) => d.lang === activeLang) ?? allDescriptions[0]

  return (
    <div role="tabpanel" id="tabpanel-intro" aria-labelledby="tab-intro">
      {/* 语言切换 Tab — 仅多语言时显示 */}
      {hasMultiple && (
        <div className="mb-4">
          <LangTabs
            descriptions={allDescriptions}
            activeLang={activeLang}
            onChange={switchLang}
          />
        </div>
      )}

      {/* 简介内容 — 淡入淡出 */}
      <div
        className="transition-opacity duration-150 ease-out"
        style={{ opacity: fading ? 0 : 1 }}
      >
        <RichTextContent html={activeDesc.text} className="prose dark:prose-invert max-w-[880px] text-[13px] sm:text-[15px] leading-[1.7] text-foreground prose-headings:font-[var(--font-heading)]" />
      </div>

      {/* 制作人员折叠卡片 — 桌面默认展开，手机默认收起 */}
      {creators.length > 0 && (
        <div className="mt-6">
          <CreatorsSection creators={creators} />
        </div>
      )}

      {/* 游戏标签 — 排在最末，整块常驻不折叠 */}
      {gameTags && gameTags.length > 0 && (
        <div className="mt-6">
          <TagsSection tags={gameTags} />
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CreatorsGrid — 制作人员网格
   ═══════════════════════════════════════════════ */

/** 收起状态下显示的人数（一行 4 个、两行） */
const CREATORS_COLLAPSE_AT = 8

function CreatorsSection({
  creators,
}: {
  creators: { id: string; slug?: string | null; role: string; name: string; avatar?: string | null; nameJa?: string | null }[]
}) {
  // 默认展开；总人数超过 8 才出现折叠按钮（一行 4 个，收起时正好两行）
  const needToggle = creators.length > CREATORS_COLLAPSE_AT
  const [open, setOpen] = useState(true)
  const shown = !needToggle || open ? creators : creators.slice(0, CREATORS_COLLAPSE_AT)

  return (
    <CollapsibleCard
      icon={<Users className="h-4 w-4 opacity-60" />}
      label="制作人员"
      count={creators.length}
      collapsible={needToggle}
      isOpen={open}
      onToggle={() => setOpen((v) => !v)}
      action={needToggle ? (open ? "收起" : `展开全部 ${creators.length} 位`) : undefined}
    >
      <CreatorsGrid creators={shown} />
    </CollapsibleCard>
  )
}

function CreatorsGrid({
  creators,
}: {
  creators: { id: string; slug?: string | null; role: string; name: string; avatar?: string | null; nameJa?: string | null }[]
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {creators.map((c) => (
        <a
          key={`${c.id}-${c.role}`}
          // slug 优先走新路由，缺失才回退旧兼容路由 /creators/{id}
          href={c.slug ? `/credits/creator/${encodeURIComponent(c.slug)}` : `/creators/${c.id}`}
          className="group flex items-center gap-2.5 rounded-xl bg-secondary/40 p-3 transition duration-150 ease-in-out hover:bg-secondary/70"
        >
          {c.avatar ? (
            <Image
              src={c.avatar}
              alt={c.name}
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {(c.nameJa || c.name)[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">{c.nameJa || c.name}</p>
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {roleLabel(c.role)}
            </p>
          </div>
        </a>
      ))}
    </div>
  )
}


/* ═══════════════════════════════════════════════
   TagsSection — 游戏标签（整块常驻：自然换行、不折叠、不「+N 更多」）
   ═══════════════════════════════════════════════ */

function TagsSection({ tags }: { tags: { name: string; color: string }[] }) {
  return (
    <CollapsibleCard
      icon={<Tags className="h-4 w-4 opacity-60" />}
      label="标签"
      collapsible={false}
    >
      <div className="flex flex-wrap gap-2">
        {tags.map((t, i) => (
          // 颜色沿用传进来的标签组色（后台「详情页信息栏标签」组），不写死常量
          <Tag key={`${t.name}-${i}`} color={t.color}>{t.name}</Tag>
        ))}
      </div>
    </CollapsibleCard>
  )
}


/* ═══════════════════════════════════════════════
   ArchiveCard — 游戏档案折叠卡片（手机端）
   ═══════════════════════════════════════════════ */

export function ArchiveCard({
  data,
  isOpen,
  onToggle,
}: {
  data: GameInfoData
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="mt-3 lg:hidden">
      <CollapsibleCard
        icon={<ChevronDown className="h-4 w-4 opacity-60" />}
        label="游戏档案"
        badge={<VndbBadge vndbId={data.vndbId} />}
        isOpen={isOpen}
        onToggle={onToggle}
      >
        <GameInfoList data={data} />
      </CollapsibleCard>
    </div>
  )
}


/* ═══════════════════════════════════════════════
   CollapsibleCard — 统一折叠卡片组件
   ═══════════════════════════════════════════════ */

function CollapsibleCard({
  icon,
  label,
  /** 标题右侧的小徽标（如 VNDB 出处链接） */
  badge,
  count,
  isOpen: controlledOpen,
  onToggle: controlledToggle,
  defaultOpen = false,
  /** 是否可折叠：false 时表头不做成按钮、不显示箭头，内容常驻（人数少时不需要折叠） */
  collapsible = true,
  /** 折叠按钮右侧的操作文案（如「展开全部 N 位」/「收起」） */
  action,
  children,
}: {
  icon: React.ReactNode
  label: string
  badge?: React.ReactNode
  count?: number
  isOpen?: boolean
  onToggle?: () => void
  defaultOpen?: boolean
  collapsible?: boolean
  action?: string
  children: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = controlledOpen ?? internalOpen
  const toggle = controlledToggle ?? (() => setInternalOpen((v) => !v))
  const expanded = collapsible ? isOpen : true

  const headInner = (
    <>
      {icon}
      <span className="text-base font-semibold text-foreground">{label}</span>
      {badge}
      {count != null && (
        <span className="text-xs font-medium text-muted-foreground">({count})</span>
      )}
      {action && <span className="ml-auto text-xs font-medium text-primary">{action}</span>}
      {collapsible && (
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-300 ease-out shrink-0",
            !action && "ml-auto",
          )}
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      )}
    </>
  )

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {collapsible ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="flex w-full items-center gap-2 px-4 py-3 hover:bg-secondary/30 transition-colors"
        >
          {headInner}
        </button>
      ) : (
        <div className="flex w-full items-center gap-2 px-4 py-3">{headInner}</div>
      )}

      {expanded && (
        <div className="border-t border-border px-4 py-3 animate-fade-in-up">
          {children}
        </div>
      )}
    </div>
  )
}
