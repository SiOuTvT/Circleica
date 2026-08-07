import Link from "next/link"
import { SafeImage } from "@/components/safe-image"
import { Tag, TagGroup } from "@/components/ui/tag"
import { WorkViewCounter } from "@/components/view-counter"
import { RichTextContent } from "@/components/rich-text-content"
import { GalvelicaWorkBreadcrumb } from "@/components/galvelica/work-breadcrumb"
import { RequestInclusionButton } from "@/components/galvelica/request-inclusion-button"
import { GalvelicaBackLink } from "@/components/galvelica/back-link"
import { SectionTitle } from "@/components/galvelica/section-title"
import type { GalvelicaWorkDetail } from "@/lib/galvelica"
import { formatZhDate } from "@/lib/date"
import { CREATOR_ROLE_LABELS } from "@/types/game"
import { Eye, Star, ArrowUpRight } from "lucide-react"

const ROLE_ORDER = ["director", "scenario", "art", "chardesign", "music", "songs"]

const statusLabel: Record<string, string> = {
  FINISHED: "已完结",
  ONGOING: "连载中",
  HIATUS: "搁置",
  CANCELLED: "已取消",
}

/* 平台/语言代码 → 可读标签（VNDB 代码） */
const PLATFORM_LABELS: Record<string, string> = {
  win: "Windows", lin: "Linux", mac: "macOS", ios: "iOS", and: "Android",
  psp: "PSP", psv: "PS Vita", ps2: "PS2", ps3: "PS3", drc: "Wii U",
  vnd: "VNDS", web: "Web", mob: "Mobile", oth: "其他",
}
const LANGUAGE_LABELS: Record<string, string> = {
  en: "English", ja: "日本語", zh: "中文", ko: "한국어", ru: "Русский",
  fr: "Français", de: "Deutsch", es: "Español", it: "Italiano", pt: "Português",
  ar: "العربية", th: "ไทย", vi: "Tiếng Việt",
}
const fmtCodes = (codes: string[], labels: Record<string, string>) =>
  codes
    .filter((c): c is string => typeof c === "string") // 防御：Json 列可能混入非字符串元素
    .map((c) => labels[c] ?? c.toUpperCase())
    .join(" / ")

/**
 * Galvelica 作品详情视图（Stage E）。
 * 同时供「已收录（/galvelica/works/<serialId>）」与「未收录（/galvelica/works/<slug>）」两条路由复用。
 * 已收录 → 显示「前往下载页」；未收录 → 显示「申请收录到 Circleica」。
 */
export function WorkDetailView({ work, tagColor }: { work: GalvelicaWorkDetail; tagColor?: string }) {
  const byRole = new Map<string, typeof work.staff>()
  for (const s of work.staff) {
    if (!byRole.has(s.role)) byRole.set(s.role, [])
    byRole.get(s.role)!.push(s)
  }
  const roles = [
    ...ROLE_ORDER.filter((r) => byRole.has(r)),
    ...[...byRole.keys()].filter((r) => !ROLE_ORDER.includes(r)),
  ]

  return (
    <div className="galvelica-root">
      <GalvelicaWorkBreadcrumb serialId={work.serialId ? String(work.serialId) : work.slug} title={work.title} />
      <WorkViewCounter workId={work.id} />

      <GalvelicaBackLink href="/galvelica" label="Galvelica" className="mb-4" />

      {/* ── 头部：封面 + 摘要 ── */}
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="galvelica-card overflow-hidden rounded-2xl">
          <div className="relative aspect-[3/4] w-full bg-muted">
            {work.coverImage ? (
              <SafeImage
                src={work.coverImage}
                alt={work.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 320px"
                priority
                quality={85}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground/40">
                <span className="text-sm">暂无封面</span>
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="galvelica-h1 sm:text-3xl">
            {work.title}
          </h1>
          {work.originalWork && (
            <p className="mt-1 text-sm text-foreground">原作：{work.originalWork}</p>
          )}
          {work.englishName && (
            <p className="mt-0.5 text-xs text-foreground">{work.englishName}</p>
          )}
          {work.doujinCategory && (
            <span
              className={`mt-2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                work.doujinCategory === "PURE"
                  ? "bg-[color-mix(in_srgb,var(--gal-accent)_14%,transparent)] text-[var(--gal-accent)]"
                  : "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
              }`}
              title={
                work.doujinCategory === "PURE"
                  ? "纯正同人：个人或无注册社团自主制作，仅同人渠道分发"
                  : "同人系公司：早年为同人社团、后期注册公司的厂商作品（同人衍生商业作）"
              }
            >
              {work.doujinCategory === "PURE" ? "纯正同人" : "同人系公司商业作"}
            </span>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {work.ratingAvg != null && (
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4 text-[var(--gal-accent)]" fill="currentColor" strokeWidth={0} />
                <span className="font-semibold text-foreground tabular-nums">{work.ratingAvg}</span>
                <span className="opacity-70">({work.ratingCount})</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="tabular-nums">{work.viewCount}</span>
            </span>
          </div>

          {/* 联动 CTA：已收录→前往下载页；未收录→申请收录 */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {work.included ? (
              <Link
                href={`/games/${work.serialId}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--gal-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-fg)] transition-opacity hover:opacity-90"
              >
                查看资源 · 前往下载页
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ) : (
              <RequestInclusionButton workId={work.id} title={work.title} />
            )}
            <GalvelicaBackLink site className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" />
          </div>

          {/* 标签 */}
          {work.tags.length > 0 && (
            <div className="mt-5">
              <TagGroup>
                {work.tags.map((t) => (
                  <Tag key={t.id} color={t.color || tagColor} href={`/galvelica/tags/${t.id}`} title={t.name}>
                    {t.name}
                  </Tag>
                ))}
              </TagGroup>
            </div>
          )}
        </div>
      </div>

      {/* ── 资料表 ── */}
      <div className="mt-8 grid gap-x-8 gap-y-3 rounded-2xl border border-border bg-card/40 p-5 sm:grid-cols-2">
        <Meta label="社团" value={work.studioName || "未知"} />
        <Meta
          label="发布时间"
          value={work.releaseDate ? formatZhDate(work.releaseDate) : work.releaseYear ? `${work.releaseYear} 年` : "未知"}
        />
        <Meta label="状态" value={statusLabel[work.status] ?? work.status} />
        {work.gameDuration && <Meta label="时长" value={work.gameDuration} />}
        {work.aliases && <Meta label="别名" value={work.aliases} />}
        {work.platforms.length > 0 && <Meta label="平台" value={fmtCodes(work.platforms, PLATFORM_LABELS)} />}
        {work.languages.length > 0 && <Meta label="语言" value={fmtCodes(work.languages, LANGUAGE_LABELS)} />}
        {work.originalLanguage && (
          <Meta label="原语言" value={LANGUAGE_LABELS[work.originalLanguage] ?? work.originalLanguage.toUpperCase()} />
        )}
        {work.officialWebsite && (
          <Meta
            label="官网"
            value={
              <a
                href={work.officialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--gal-accent)] hover:underline"
              >
                {work.officialWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
              </a>
            }
          />
        )}
        {work.vndbId && (
          <Meta
            label="VNDB"
            value={
              <a
                href={`https://vndb.org/${work.vndbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--gal-accent)] hover:underline"
              >
                {work.vndbId} ↗
              </a>
            }
          />
        )}
      </div>

      {/* ── 截图画廊（方案B） ── */}
      {work.screenshots.length > 0 && (
        <section className="mt-8">
          <SectionTitle>截图</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {work.screenshots.slice(0, 8).map((url, i) => (
              <a
                key={`${url}-${i}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="galvelica-card group block overflow-hidden rounded-xl"
                title={`查看原图 ${i + 1}`}
              >
                <div className="relative aspect-[16/9] w-full bg-muted">
                  <SafeImage
                    src={url}
                    alt={`${work.title} 截图 ${i + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 45vw, 280px"
                    loading="lazy"
                  />
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── 制作人员 ── */}
      {roles.length > 0 && (
        <section className="mt-8">
          <SectionTitle>制作人员</SectionTitle>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {roles.map((role) => (
              <div key={role} className="flex gap-3">
                <span className="w-16 shrink-0 pt-0.5 text-sm font-medium text-[var(--gal-accent)]">
                  {CREATOR_ROLE_LABELS[role] ?? role}
                </span>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {byRole.get(role)!.map((s) => (
                    <Link
                      key={s.id}
                      href={`/creators/${s.id}`}
                      className="text-foreground transition-colors hover:text-[var(--gal-accent)]"
                    >
                      {s.name}
                      {s.nameJa && <span className="text-muted-foreground">（{s.nameJa}）</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 简介 ── */}
      {work.description && (
        <section className="mt-8">
          <SectionTitle>简介</SectionTitle>
          <RichTextContent html={work.description} className="max-w-3xl text-[15px] leading-relaxed text-foreground/90" />
        </section>
      )}

      {/* ── 系列 / 相似作品 ── */}
      {work.siblings.length > 0 && (
        <section className="mt-8">
          <SectionTitle>同系列 / 相似作品</SectionTitle>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
            {work.siblings.map((s) => (
              <Link key={s.id} href={s.href} className="galvelica-card group block overflow-hidden rounded-2xl">
                <div className="relative aspect-[3/4] w-full bg-muted">
                  {s.coverImage ? (
                    <SafeImage
                      src={s.coverImage}
                      alt={s.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 30vw, 160px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground/40 text-xs">
                      无封面
                    </div>
                  )}
                </div>
                <p className="line-clamp-2 p-2 text-xs font-medium leading-snug text-foreground group-hover:text-[var(--gal-accent)]">
                  {s.title}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-foreground">{value}</span>
    </div>
  )
}
