import { Fragment } from "react"
import {
  BookOpen, Building2, Calendar, CircleDot, Clock, ExternalLink, Globe, Languages, Monitor, ShieldAlert,
} from "lucide-react"
import {
  PLATFORM_LABELS, langLabel, GAME_STATUS_LABELS, GAME_STATUS_COLORS, AGE_RATING_LABELS,
} from "@/lib/game-meta"
import { studioRoleLabel } from "@/lib/role-labels"
import { FeedbackBtn } from "@/components/feedback-btn"

export interface GameInfoData {
  releaseDate?: string
  status?: string
  studios?: { name: string; normalized: string; slug?: string | null; role?: string | null }[]
  gameDuration?: string
  platforms?: string[]
  languages?: string[]
  originalLanguage?: string
  ageRating?: string
  officialWebsite?: string
  englishName?: string
  originalWork?: string
  vndbId?: string
  /** 底部反馈条用：走举报 API */
  gameId: string
}

/** 每行「label 左 / 值右」：值与卡片内容右边缘对齐，长值换行时仍右靠齐 */
function Row({
  icon, label, children,
}: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-1.5 gap-y-1.5 text-right">
        {children}
      </div>
    </div>
  )
}

/** 能跳走的值：primary + 600 + 尾部 12px ↗；hover 只改透明度，不加下划线 */
function ExtLink({
  href, title, children,
}: { href: string; title?: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      title={title}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary transition-opacity hover:opacity-80"
    >
      {children}
      <ExternalLink className="h-3 w-3" strokeWidth={2} />
    </a>
  )
}

function Text({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-semibold text-foreground">{children}</span>
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold bg-secondary text-foreground">
      {children}
    </span>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-secondary text-foreground">
      {children}
    </span>
  )
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[28px] items-center rounded-md px-2.5 py-1 text-xs font-semibold transition duration-150 ease-in-out hover:opacity-80 bg-secondary text-foreground"
    >
      {children}
    </a>
  )
}

/**
 * 游戏档案信息卡（桌面右侧 360px 卡 + 移动端折叠卡共用）。
 * 所有基础信息字段统一在此渲染，避免前台/后台不一致。
 */
/** 提取 VNDB 数字编号：档案行与卡头徽标共用同一套判定 */
export function vndbNumericId(vndbId?: string): string | null {
  if (!vndbId) return null
  // 只接受标准 VNDB ID（v12345 或 12345）；非数字格式（如测试数据的 seed-xxx）不渲染，
  // 避免出现无意义的字母串。
  const rawId = vndbId.startsWith("v") ? vndbId : `v${vndbId}`
  const numericId = rawId.replace(/^v/, "")
  return /^\d+$/.test(numericId) ? numericId : null
}

/**
 * @param showTitle 桌面右侧卡片自己没有「游戏档案」标题时在字段前补一行标题。
 *                  移动端折叠卡的标题由 CollapsibleCard 的 label 渲染，不传此项，避免出现两个标题。
 */
export function GameInfoList({ data, showTitle = false }: { data: GameInfoData; showTitle?: boolean }) {
  const {
    releaseDate, status, studios, gameDuration, platforms, languages,
    originalLanguage, ageRating, officialWebsite, englishName, originalWork, vndbId,
    gameId,
  } = data

  const platformChips = (platforms ?? []).map((c) => PLATFORM_LABELS[c] ?? c.toUpperCase())
  const langChips = (languages ?? []).map((c) => langLabel(c))
  const hasContent =
    releaseDate || status || (studios && studios.length) || gameDuration || platformChips.length ||
    langChips.length || originalLanguage || ageRating || officialWebsite || englishName ||
    originalWork || vndbId

  if (!hasContent) return null

  const vndbNum = vndbNumericId(vndbId)

  return (
    <div className="space-y-3.5">
      {showTitle && (
        <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
          <span className="text-[13px] font-semibold text-foreground">游戏档案</span>
        </div>
      )}

      {originalWork && (
        <Row icon={<BookOpen className="h-4 w-4" strokeWidth={2} />} label="原名">
          <Text>{originalWork}</Text>
        </Row>
      )}

      {englishName && (
        <Row icon={<Languages className="h-4 w-4" strokeWidth={2} />} label="英文名">
          <Text>{englishName}</Text>
        </Row>
      )}

      {releaseDate && (
        <Row icon={<Calendar className="h-4 w-4" strokeWidth={2} />} label="发行日期">
          <Text>{releaseDate}</Text>
        </Row>
      )}

      {studios && studios.length > 0 && (
        <Row icon={<Building2 className="h-4 w-4" strokeWidth={2} />} label="制作会社">
          {/* 多个会社用顿号「、」连：各自仍是独立链接，不合并成一条；每个带 studioRoleLabel 小标签，role 为空则不加 */}
          {studios.map((s, i) => {
            const lab = studioRoleLabel(s.role)
            return (
              <Fragment key={s.normalized}>
                {i > 0 && <span className="text-xs text-muted-foreground">、</span>}
                <a
                  href={`/credits/studio/${encodeURIComponent(s.slug ?? s.normalized)}`}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary transition-opacity hover:opacity-80"
                >
                  {lab ? <span className="mr-1.5 text-[11px] font-medium text-muted-foreground">{lab}</span> : null}
                  {s.name}
                  <ExternalLink className="h-3 w-3" strokeWidth={2} />
                </a>
              </Fragment>
            )
          })}
        </Row>
      )}

      {/* 多值字段用顿号连成一行文本（chip 只留给能点走的东西：制作会社 / VNDB） */}
      {platformChips.length > 0 && (
        <Row icon={<Monitor className="h-4 w-4" strokeWidth={2} />} label="平台">
          <span className="text-[13px] font-semibold text-foreground">{platformChips.join("、")}</span>
        </Row>
      )}

      {langChips.length > 0 && (
        <Row icon={<Globe className="h-4 w-4" strokeWidth={2} />} label="语言">
          <span className="text-[13px] font-semibold text-foreground">{langChips.join("、")}</span>
        </Row>
      )}

      {originalLanguage && (
        <Row icon={<Globe className="h-4 w-4" strokeWidth={2} />} label="原版语言">
          <span className="text-[13px] font-semibold text-foreground">{langLabel(originalLanguage)}</span>
        </Row>
      )}

      {gameDuration && (
        <Row icon={<Clock className="h-4 w-4" strokeWidth={2} />} label="时长">
          <Pill>{gameDuration}</Pill>
        </Row>
      )}

      {vndbNum && (
        <Row icon={<ExternalLink className="h-4 w-4" strokeWidth={2} />} label="VNDB">
          <ExtLink href={`https://vndb.org/v${vndbNum}`}>v{vndbNum}</ExtLink>
        </Row>
      )}

      {status && (
        <Row icon={<CircleDot className="h-4 w-4" strokeWidth={2} />} label="制作状态">
          <Pill>
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: GAME_STATUS_COLORS[status] ?? "var(--muted-foreground)" }} />
            {GAME_STATUS_LABELS[status] ?? status}
          </Pill>
        </Row>
      )}

      {ageRating && (
        <Row icon={<ShieldAlert className="h-4 w-4" strokeWidth={2} />} label="年龄分级">
          <Pill>{AGE_RATING_LABELS[ageRating] ?? "未知"}</Pill>
        </Row>
      )}

      {officialWebsite && (
        <Row icon={<ExternalLink className="h-4 w-4" strokeWidth={2} />} label="官方网站">
          <Link href={officialWebsite}>{officialWebsite.replace(/^https?:\/\//, "")}</Link>
        </Row>
      )}

      {/* 底部只留一条：反馈问题（全宽；收藏条已删） */}
      <div className="pt-1">
        <FeedbackBtn
          gameId={gameId}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg h-8 text-[13px] font-semibold bg-card ring-1 ring-border text-muted-foreground transition-[color,background-color,box-shadow,opacity] duration-200 hover:text-foreground"
        />
      </div>
    </div>
  )
}
