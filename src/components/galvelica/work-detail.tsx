import Link from "next/link"
import { SafeImage } from "@/components/safe-image"
import { WorkViewCounter } from "@/components/view-counter"
import { ViewHistoryRecorder } from "@/components/view-history-recorder"
import { GalvelicaWorkBreadcrumb } from "@/components/galvelica/work-breadcrumb"
import { RequestInclusionButton } from "@/components/galvelica/request-inclusion-button"
import { GalvelicaEyebrow } from "@/components/galvelica/galvelica-eyebrow"
import { SectionTitle } from "@/components/galvelica/section-title"
import { GalvelicaWorkDescription } from "@/components/galvelica/work-description"
import { GalvelicaCover } from "@/components/galvelica/galvelica-cover"
import { GalvelicaEntryRow } from "@/components/galvelica/galvelica-entry-row"
import { GalvelicaCategoryNote } from "@/components/galvelica/galvelica-category-note"
import type { GalvelicaWorkDetail } from "@/lib/galvelica"
import { getStaffBrief, getTagWorkCounts, listWorks } from "@/lib/galvelica"
import { formatZhDate } from "@/lib/date"
import { CREATOR_ROLE_LABELS } from "@/types/game"
import { Star, ArrowUpRight } from "lucide-react"

const ROLE_ORDER = ["director", "scenario", "art", "chardesign", "music", "songs"]

/** 标题比较：去首尾空白 + 转小写 + NFKC 全角转半角，忽略大小写与全/半角差异 */
function normalizeForCompare(s: string): string {
  return s.trim().toLowerCase().normalize("NFKC")
}
function isSameTitle(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  return normalizeForCompare(a) === normalizeForCompare(b)
}

/** 详情简介是 HTML，头部「一句简介」只取纯文本 */
function toPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
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

/** 站外链接：结尾用 ArrowUpRight（12px）替代「↗」字符，避免不同字体基线漂移 */
function ExtLink({ href, text }: { href: string; text: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="galvelica-ext">
      {text}
      <ArrowUpRight size={12} className="galvelica-ext-icon" aria-hidden />
    </a>
  )
}

/**
 * Galvelica 作品详情视图。
 * 同时供「已收录（/galvelica/works/<serialId>）」与「未收录（/galvelica/works/<slug>）」两条路由复用。
 * 已收录 → 显示「查看资源」；未收录 → 显示「申请收录到 Circleica」。
 */
export async function WorkDetailView({ work }: { work: GalvelicaWorkDetail }) {
  const byRole = new Map<string, typeof work.staff>()
  for (const s of work.staff) {
    if (!byRole.has(s.role)) byRole.set(s.role, [])
    byRole.get(s.role)!.push(s)
  }
  const roles = [
    ...ROLE_ORDER.filter((r) => byRole.has(r)),
    ...[...byRole.keys()].filter((r) => !ROLE_ORDER.includes(r)),
  ]
  const lede = work.description ? toPlainText(work.description) : ""

  // 制作人员：一次聚合出每人的站内作品数（服务端判断，只有 1 部作品就不给链接）
  const staffBrief = await getStaffBrief(work.staff.map((s) => s.id))
  const staffCount = new Map(staffBrief.map((b) => [b.id, b.workCount]))

  // 相关作品：全部复用 listWorks，不新增查询函数
  // 同标签取「站内作品数最少且至少还有别的作品」的那个标签，避免命中几千部的大标签
  const tagCounts = await getTagWorkCounts(work.tags.map((t) => t.id))
  const rarestTag = work.tags
    .map((t) => ({ tag: t, count: tagCounts[t.id] ?? 0 }))
    .filter((x) => x.count >= 2)
    .sort((a, b) => a.count - b.count)[0]

  const [studioRes, tagRes] = await Promise.all([
    work.studioName ? listWorks({ studio: work.studioName, sort: "year", pageSize: 7 }) : Promise.resolve(null),
    rarestTag ? listWorks({ tags: [rarestTag.tag.id], sort: "year", pageSize: 7 }) : Promise.resolve(null),
  ])
  // 排除当前作品自身；不足 3 条整块不渲染
  const studioOthers = (studioRes?.items ?? []).filter((w) => w.id !== work.id).slice(0, 6)
  const tagOthers = (tagRes?.items ?? []).filter((w) => w.id !== work.id).slice(0, 6)

  return (
    <div>
      <GalvelicaWorkBreadcrumb serialId={work.serialId ? String(work.serialId) : work.slug} title={work.title} />

      {/* ── 头部：左索引卡 + 右文献区 ── */}
      <div className="galvelica-detail-head">
        <div className="galvelica-detail-card">
          <GalvelicaCover src={work.coverImage} alt={work.title} size="xl" priority />

          <div className="galvelica-archive">
            {work.vndbId && (
              <div className="galvelica-archive-row">
                <span className="galvelica-archive-label">VNDB 编号</span>
                <span className="galvelica-archive-value">
                  <ExtLink href={`https://vndb.org/${work.vndbId}`} text={work.vndbId} />
                </span>
              </div>
            )}
            <div className="galvelica-archive-row">
              <span className="galvelica-archive-label">浏览</span>
              <span className="galvelica-archive-value">
                <WorkViewCounter workId={work.id} initialCount={work.viewCount} className="galvelica-archive-counter" />
              </span>
            </div>
          </div>
        </div>

        <div className="galvelica-detail-main">
          <GalvelicaEyebrow text="GALVELICA 作品" />
          <h1 className="galvelica-detail-title">{work.title}</h1>

          {work.originalWork && !isSameTitle(work.originalWork, work.title) && (
            <p className="galvelica-detail-alt">{work.originalWork}</p>
          )}
          {work.englishName && <p className="galvelica-detail-alt">{work.englishName}</p>}
          {work.doujinCategory && <GalvelicaCategoryNote category={work.doujinCategory} />}
          {lede && <p className="galvelica-detail-lede">{lede}</p>}

          <div className="galvelica-detail-stats">
            {work.ratingAvg != null && (
              <span className="galvelica-detail-rating">
                <Star className="h-3.5 w-3.5 text-[var(--gal-accent)]" fill="currentColor" strokeWidth={0} />
                <span className="galvelica-detail-rating-num">{work.ratingAvg}</span>
                {work.ratingCount > 0 && <span className="opacity-70">({work.ratingCount})</span>}
              </span>
            )}
            <ViewHistoryRecorder targetType="WORK" targetId={work.id} />
          </div>

          {/* 联动 CTA：已收录→查看资源；未收录→申请收录。窄屏保持整宽堆叠 */}
          <div className="galvelica-detail-cta">
            {work.included ? (
              <Link href={`/games/${work.serialId}`} className="galvelica-cta galvelica-cta-primary">
                查看资源
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ) : (
              <RequestInclusionButton workId={work.id} title={work.title} />
            )}
          </div>

          {/* 标签：与首页同一条索引横条，一律不上色 */}
          {work.tags.length > 0 && (
            <div className="galvelica-strip galvelica-detail-tags">
              {work.tags.map((t) => (
                <Link key={t.id} href={`/galvelica/tags/${t.id}`} className="galvelica-strip-item">
                  <b>{t.name}</b>
                  {typeof t.count === "number" && <i>{t.count}</i>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 资料表 ── */}
      <div className="galvelica-meta">
        <Meta label="社团" value={work.studioName || "未知"} />
        <Meta
          label="发布时间"
          value={work.releaseDate ? formatZhDate(work.releaseDate) : work.releaseYear ? `${work.releaseYear} 年` : "未知"}
        />
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
            value={<ExtLink href={work.officialWebsite} text={work.officialWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")} />}
          />
        )}
        {work.vndbId && <Meta label="VNDB" value={<ExtLink href={`https://vndb.org/${work.vndbId}`} text={work.vndbId} />} />}
      </div>

      {/* ── 简介 ── */}
      {work.description && (
        <section className="galvelica-detail-section">
          <SectionTitle>简介</SectionTitle>
          <GalvelicaWorkDescription html={work.description} />
        </section>
      )}

      {/* ── 截图 ── */}
      {work.screenshots.length > 0 && (
        <section className="galvelica-detail-section">
          <SectionTitle>截图</SectionTitle>
          <div className="galvelica-shots">
            {work.screenshots.slice(0, 8).map((url, i) => (
              <a
                key={`${url}-${i}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="galvelica-shot"
              >
                <div className="relative aspect-[16/9] w-full bg-muted">
                  <SafeImage
                    src={url}
                    alt={`${work.title} 截图 ${i + 1}`}
                    fill
                    className="object-cover"
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
        <section className="galvelica-detail-section">
          <SectionTitle>制作人员</SectionTitle>
          <div className="galvelica-staff">
            {roles.map((role) => (
              <div key={role} className="galvelica-staff-group">
                <h3 className="galvelica-staff-title">{CREATOR_ROLE_LABELS[role] ?? role}</h3>
                {byRole.get(role)!.map((s) => {
                  // 只在站内还有别的作品时才做成链接（判断在服务端，用按人聚合的计数）
                  const linkable = (staffCount.get(s.id) ?? 0) > 1
                  return (
                    <div key={s.id} className="galvelica-staff-row">
                      <span className="galvelica-staff-left">
                        {linkable ? (
                          <Link
                            href={`/galvelica/works?staff=${encodeURIComponent(s.id)}`}
                            className="galvelica-staff-name"
                          >
                            {s.name}
                          </Link>
                        ) : (
                          <span className="galvelica-staff-name">{s.name}</span>
                        )}
                      </span>
                      {s.nameJa && <span className="galvelica-staff-note">{s.nameJa}</span>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 系列 / 相似作品 ── */}
      {work.siblings.length > 0 && (
        <section className="galvelica-detail-section">
          <SectionTitle>同系列 / 相似作品</SectionTitle>
          <div className="galvelica-siblings">
            {work.siblings.map((s) => (
              <Link key={s.id} href={s.href} className="galvelica-sibling">
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                  {s.coverImage ? (
                    <SafeImage src={s.coverImage} alt={s.title} fill className="object-cover" sizes="160px" loading="lazy" />
                  ) : (
                    <div className="galvelica-sibling-empty">无封面</div>
                  )}
                </div>
                <p className="galvelica-sibling-title">{s.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 同社团其它作品（不足 3 条整块不渲染） ── */}
      {studioOthers.length >= 3 && (
        <section className="galvelica-detail-section">
          <SectionTitle>同社团其它作品</SectionTitle>
          <div className="galvelica-grid-2">
            {studioOthers.map((w) => (
              <GalvelicaEntryRow key={w.id} work={w} />
            ))}
          </div>
        </section>
      )}

      {/* ── 同标签作品：定案排在最后（取站内作品数最少的非通用标签；不足 3 条整块不渲染） ── */}
      {tagOthers.length >= 3 && rarestTag && (
        <section className="galvelica-detail-section">
          <SectionTitle>同标签作品</SectionTitle>
          <div className="galvelica-grid-2">
            {tagOthers.map((w) => (
              <GalvelicaEntryRow key={w.id} work={w} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="galvelica-meta-item">
      <span className="galvelica-meta-label">{label}</span>
      <span className="galvelica-meta-value">{value}</span>
    </div>
  )
}
