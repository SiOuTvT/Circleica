import type { TagInfo } from "@/types/game"
import { BookOpen, Building2, Calendar, Clock, ExternalLink, Gamepad2, Monitor } from "lucide-react"
import Link from "next/link"

/* 莫兰迪灰蓝色调 — 统一低饱和度 */
const MLD = {
  bg: "rgba(148, 163, 184, 0.12)",
  text: "#94a0b0",
  bgPurple: "rgba(168, 162, 186, 0.12)",
  textPurple: "#a098b0",
}

interface ProfileCardProps {
  releaseDate?: string
  studioName?: string
  platformTags?: string[]
  genreTags: TagInfo[]
  storyTags: TagInfo[]
  gameDuration?: string
  vndbId?: string
}

function InfoRow({ icon: Icon, label, children }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: MLD.text }} strokeWidth={2} />
      <div className="flex flex-wrap items-center gap-x-1 min-w-0">
        <span className="text-xs font-medium shrink-0" style={{ color: MLD.text }}>{label}</span>
        {children}
      </div>
    </div>
  )
}

function TagBadge({ children, variant = "default", href }: {
  children: React.ReactNode
  variant?: "default" | "purple"
  href?: string
}) {
  const cls = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-all hover:opacity-80"
  const style = {
    background: variant === "purple" ? MLD.bgPurple : MLD.bg,
    color: variant === "purple" ? MLD.textPurple : MLD.text,
  }
  if (href) {
    return <Link href={href} className={cls} style={style}>{children}</Link>
  }
  return <span className={cls} style={style}>{children}</span>
}

export function ProfileCard({
  releaseDate,
  studioName,
  platformTags,
  genreTags,
  storyTags,
  gameDuration,
  vndbId,
}: ProfileCardProps) {
  return (
    <div
      className="hidden lg:block w-[300px] shrink-0 rounded-2xl p-5 bg-card ring-1 ring-border"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <div className="space-y-3">
        {/* 发售日期 */}
        {releaseDate && (
          <InfoRow icon={Calendar} label="发售日期：">
            <span className="text-xs font-semibold text-foreground">{releaseDate}</span>
          </InfoRow>
        )}

        {/* 制作会社 */}
        {studioName && (
          <InfoRow icon={Building2} label="制作会社：">
            <TagBadge>{studioName}</TagBadge>
          </InfoRow>
        )}

        {/* 支持平台 */}
        {platformTags && platformTags.length > 0 && (
          <InfoRow icon={Monitor} label="支持平台：">
            {platformTags.map((tag, i) => (
              <TagBadge key={i}>{tag}</TagBadge>
            ))}
          </InfoRow>
        )}

        {/* 游戏类型 */}
        {genreTags.length > 0 && (
          <InfoRow icon={Gamepad2} label="游戏类型：">
            {genreTags.map((tag, i) => (
              <TagBadge key={i} variant="purple" href={`/search?tag=${encodeURIComponent(tag.name)}`}>{tag.name}</TagBadge>
            ))}
          </InfoRow>
        )}

        {/* 游戏时长 */}
        {gameDuration && (
          <InfoRow icon={Clock} label="游戏时长：">
            <TagBadge>{gameDuration}</TagBadge>
          </InfoRow>
        )}

        {/* 剧情标签 */}
        {storyTags.length > 0 && (
          <InfoRow icon={BookOpen} label="剧情标签：">
            {storyTags.map((tag, i) => (
              <TagBadge key={i} href={`/search?tag=${encodeURIComponent(tag.name)}`}>{tag.name}</TagBadge>
            ))}
          </InfoRow>
        )}

        {/* VNDB 链接 */}
        {vndbId && (
          <InfoRow icon={ExternalLink} label="VNDB：">
            <a
              href={`https://vndb.org/v${vndbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-all hover:opacity-80"
              style={{ background: MLD.bg, color: MLD.text }}
            >
              v{vndbId}
            </a>
          </InfoRow>
        )}
      </div>
    </div>
  )
}