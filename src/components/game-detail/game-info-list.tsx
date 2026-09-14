import {
  BookOpen, CircleDot, ExternalLink, Globe, Languages,
} from "lucide-react"
import {
  langLabel, GAME_STATUS_LABELS, GAME_STATUS_COLORS,
} from "@/lib/game-meta"
import { FeedbackBtn } from "@/components/feedback-btn"

export interface GameInfoData {
  status?: string
  originalLanguage?: string
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
    status, originalLanguage, officialWebsite, englishName, originalWork, vndbId,
    gameId,
  } = data

  const hasContent =
    status || originalLanguage || officialWebsite || englishName || originalWork || vndbId

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

      {originalLanguage && (
        <Row icon={<Globe className="h-4 w-4" strokeWidth={2} />} label="原版语言">
          <span className="text-[13px] font-semibold text-foreground">{langLabel(originalLanguage)}</span>
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
