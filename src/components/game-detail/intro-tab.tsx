"use client"

import { cn } from "@/lib/utils"
import { RichTextContent } from "@/components/rich-text-content-wrapper"
import { ChevronDown, Images, Tags, Users } from "lucide-react"
import Image from "next/image"
import { ScreenshotLightbox } from "@/components/gallery-hero"
import { useCallback, useEffect, useRef, useState } from "react"
import { GameInfoList, type GameInfoData } from "./game-info-list"
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
   Section — 简介 tab 内统一的块（无卡壳：无背景 / 无边框 / 无圆角 / 无内边距）
   标题 15px / font-semibold，标题与内容间距 8px；块与块之间 24px（由外层 space-y-6 提供）
   ═══════════════════════════════════════════════ */

function Section({
  title,
  count,
  action,
  extra,
  children,
}: {
  title: string
  count?: number
  /** 标题右侧的操作文案（如「展开 / 收起」） */
  action?: { label: string; onClick: () => void }
  /** 标题行最右侧的附加内容（如语言切换 tab） */
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {count != null && (
          <span className="text-xs font-normal text-muted-foreground">({count})</span>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-xs font-medium text-primary hover:opacity-80 transition-opacity"
          >
            {action.label}
          </button>
        )}
        {extra && <div className="ml-auto min-w-0">{extra}</div>}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  )
}

/* ═══════════════════════════════════════════════
   IntroTab — 游戏简介 + 截图 + 制作人员 + 标签
   ═══════════════════════════════════════════════ */

export function IntroTab({
  description,
  allDescriptions,
  creators,
  gameTags,
  screenshots,
  gameTitle,
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
  /** 截图：原首页右侧画廊搬到这里，改用网格版式 */
  screenshots?: string[]
  gameTitle: string
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

  const activeDesc =
    allDescriptions && allDescriptions.length > 0
      ? allDescriptions.find((d) => d.lang === activeLang) ?? allDescriptions[0]
      : null
  const prose = activeDesc ? activeDesc.text : description

  return (
    <div role="tabpanel" id="tabpanel-intro" aria-labelledby="tab-intro">
      <div className="space-y-6">
        {/* ① 简介 — 语言切换 tab 挂在标题行右侧（它切的就是这段简介文本） */}
        <Section
          title="简介"
          extra={
            hasMultiple && allDescriptions ? (
              <LangTabs
                descriptions={allDescriptions}
                activeLang={activeLang}
                onChange={switchLang}
              />
            ) : undefined
          }
        >
          {prose ? (
            <div
              className="transition-opacity duration-150 ease-out"
              style={{ opacity: fading ? 0 : 1 }}
            >
              <RichTextContent html={prose} className="prose dark:prose-invert max-w-[880px] text-[13px] sm:text-[15px] leading-[1.7] text-foreground prose-headings:font-[var(--font-heading)]" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic">暂无简介</p>
          )}
        </Section>

        {/* ② 截图 */}
        {screenshots && screenshots.length > 0 && (
          <Section title="截图" count={screenshots.length}>
            <ScreenshotGrid screenshots={screenshots} gameTitle={gameTitle} />
          </Section>
        )}

        {/* ③ 制作人员（默认收起，点标题展开） */}
        {creators.length > 0 && <CreatorsSection creators={creators} />}

        {/* ④ 游戏标签 — 整块常驻，不折叠、不「+N 更多」 */}
        {gameTags && gameTags.length > 0 && (
          <Section title="标签" count={gameTags.length}>
            <div className="flex flex-wrap gap-1.5">
              {gameTags.map((t, i) => (
                // 颜色沿用传进来的标签组色（后台「详情页信息栏标签」组），不写死常量
                <Tag key={`${t.name}-${i}`} scale="detail" color={t.color}>{t.name}</Tag>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CreatorsGrid — 制作人员网格
   ═══════════════════════════════════════════════ */

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

function CreatorsSection({
  creators,
}: {
  creators: { id: string; slug?: string | null; role: string; name: string; avatar?: string | null; nameJa?: string | null }[]
}) {
  // 默认态：桌面（≥1024）展开、手机（<1024）收起。
  // 不在 useState 初始化函数里读 window —— 那样服务端首帧与客户端首帧不一致，会 hydration 报错；
  // 挂载后用 matchMedia 定一次默认值，之后用户手动开合就听他的（本会话内保持，不写 localStorage）。
  const [open, setOpen] = useState(false)
  const userToggledRef = useRef(false)

  useEffect(() => {
    if (userToggledRef.current) return
    setOpen(window.matchMedia("(min-width: 1024px)").matches)
  }, [])

  return (
    <Section
      title="制作人员"
      count={creators.length}
      action={{
        label: open ? "收起" : "展开",
        onClick: () => {
          userToggledRef.current = true
          setOpen((v) => !v)
        },
      }}
    >
      {open ? (
        <CreatorsGrid creators={creators} />
      ) : null}
    </Section>
  )
}

/* ═══════════════════════════════════════════════
   ScreenshotGrid — 截图网格（原首屏右 58% 画廊搬到这里）
   ═══════════════════════════════════════════════ */

/** 网格最多占 8 格，多出的合并进最后一格的「+N」遮罩 */
const SHOTS_MAX = 8

function ScreenshotGrid({
  screenshots,
  gameTitle,
}: {
  screenshots: string[]
  gameTitle: string
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const shown = screenshots.slice(0, SHOTS_MAX)
  const rest = screenshots.length - shown.length

  // 索引受控：点第几张灯箱就从第几张开
  const openAt = (index: number) => {
    setActiveIndex(index)
    setOpen(true)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {shown.map((src, i) => {
          const overflow = i === shown.length - 1 && rest > 0
          return (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => openAt(i)}
              className="relative aspect-[16/9] overflow-hidden rounded-lg border border-border bg-secondary"
              aria-label={overflow ? `查看全部截图（还有 ${rest} 张）` : `查看第 ${i + 1} 张截图`}
            >
              <Image
                src={src}
                alt={overflow ? `${gameTitle} 截图（还有 ${rest} 张）` : `${gameTitle} 截图 ${i + 1}`}
                fill
                className="object-cover"
                draggable={false}
                sizes="(max-width: 640px) 45vw, 220px"
              />
              {overflow && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                  +{rest}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <ScreenshotLightbox
        images={screenshots}
        index={activeIndex}
        open={open}
        onClose={() => setOpen(false)}
        onIndexChange={setActiveIndex}
        altTitle={gameTitle}
      />
    </>
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
        isOpen={isOpen}
        onToggle={onToggle}
      >
        <GameInfoList data={data} />
      </CollapsibleCard>
    </div>
  )
}


/* ═══════════════════════════════════════════════
   CollapsibleCard — 移动端档案卡用的折叠卡片
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
