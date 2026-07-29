import {
  BookOpen, Building2, Calendar, CircleDot, Clock, ExternalLink, Gamepad2, Globe, Monitor, ShieldAlert,
} from "lucide-react"
import { Tag } from "@/components/ui/tag"
import {
  PLATFORM_LABELS, langLabel, GAME_STATUS_LABELS, GAME_STATUS_COLORS, AGE_RATING_LABELS,
} from "@/lib/game-meta"

export interface GameInfoData {
  releaseDate?: string
  status?: string
  studioName?: string
  gameDuration?: string
  platforms?: string[]
  languages?: string[]
  originalLanguage?: string
  ageRating?: string
  officialWebsite?: string
  englishName?: string
  vndbId?: string
  gameTags?: { name: string; color: string; groupName?: string }[]
}

function Row({
  icon, label, children,
}: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="flex flex-1 flex-wrap items-center gap-x-1.5 gap-y-1.5 min-w-0">
        <span className="text-sm font-medium shrink-0 text-muted-foreground">{label}</span>
        {children}
      </div>
    </div>
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
      className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-80 bg-secondary text-foreground"
    >
      {children}
    </a>
  )
}

/**
 * 游戏档案信息卡（桌面右侧 360px 卡 + 移动端折叠卡共用）。
 * 所有基础信息字段统一在此渲染，避免前台/后台不一致。
 */
export function GameInfoList({ data }: { data: GameInfoData }) {
  const {
    releaseDate, status, studioName, gameDuration, platforms, languages,
    originalLanguage, ageRating, officialWebsite, englishName, vndbId, gameTags,
  } = data

  const platformChips = (platforms ?? []).map((c) => PLATFORM_LABELS[c] ?? c.toUpperCase())
  const langChips = (languages ?? []).map((c) => langLabel(c))
  const hasContent =
    releaseDate || status || studioName || gameDuration || platformChips.length ||
    langChips.length || originalLanguage || ageRating || officialWebsite || englishName || vndbId || (gameTags && gameTags.length)

  if (!hasContent) return null

  return (
    <div className="space-y-3.5">
      {releaseDate && (
        <Row icon={<Calendar className="h-4 w-4" strokeWidth={2} />} label="发售日期">
          <Text>{releaseDate}</Text>
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

      {studioName && (
        <Row icon={<Building2 className="h-4 w-4" strokeWidth={2} />} label="制作会社">
          <Pill>{studioName}</Pill>
        </Row>
      )}

      {gameDuration && (
        <Row icon={<Clock className="h-4 w-4" strokeWidth={2} />} label="游戏时长">
          <Pill>{gameDuration}</Pill>
        </Row>
      )}

      {platformChips.length > 0 && (
        <Row icon={<Monitor className="h-4 w-4" strokeWidth={2} />} label="支持平台">
          {platformChips.map((p) => <Chip key={p}>{p}</Chip>)}
        </Row>
      )}

      {langChips.length > 0 && (
        <Row icon={<Globe className="h-4 w-4" strokeWidth={2} />} label="游戏语言">
          {langChips.map((l) => <Chip key={l}>{l}</Chip>)}
        </Row>
      )}

      {originalLanguage && (
        <Row icon={<Globe className="h-4 w-4" strokeWidth={2} />} label="原始语言">
          <Chip>{langLabel(originalLanguage)}</Chip>
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

      {englishName && (
        <Row icon={<BookOpen className="h-4 w-4" strokeWidth={2} />} label="英文名称">
          <Text>{englishName}</Text>
        </Row>
      )}

      {vndbId && (() => {
        const rawId = vndbId.startsWith("v") ? vndbId : `v${vndbId}`
        const numericId = rawId.replace(/^v/, "")
        return (
          <Row icon={<ExternalLink className="h-4 w-4" strokeWidth={2} />} label="VNDB">
            <Link href={`https://vndb.org/v${numericId}`}>v{numericId}</Link>
          </Row>
        )
      })()}

      {gameTags && gameTags.length > 0 && (
        <Row icon={<Gamepad2 className="h-4 w-4" strokeWidth={2} />} label="游戏标签">
          {gameTags.map((tag, i) => (
            <Tag key={i} color={tag.color || "#6b7280"}>{tag.name}</Tag>
          ))}
        </Row>
      )}
    </div>
  )
}
