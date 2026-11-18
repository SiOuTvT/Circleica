/**
 * Galvelica 副站全量作品优先级表格（总生成脚本）。
 *
 * 设计要点：
 *  - 全库一部不漏；分类只是额外视图，总表不预过滤（筛选权归用户，用表头筛选器自行开关）。
 *  - 六维加权，口碑权重最高：口碑30% 质量25% 画面15% 社团15% 体量10% 主创5%。
 *  - 缺失数据不惩罚：任一维度缺失一律回到中位 50，绝不让无数据作品沉底。
 *  - 18+ 与全年龄一视同仁：不降权、不排除，仅在「内容分级」列如实标记。
 *  - 纯拔作为唯一例外：命中「拔作」标签综合分 -15，并单独出分表。
 *  - 中文名：VNDB 官方中文名 > 原语言即中文 > 机器翻译缓存 > 待译。
 *
 * 产出：
 *  - data/rank-base.json          按优先级排序的待译清单（供 translate-titles.ts 消费）
 *  - galvelica-priority-raw.xlsx  原始表格（随后由 fix-xlsx-style.ps1 补自动换行样式）
 *
 * 用法：node --env-file=.env --import tsx scripts/build-priority-table.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { realPrisma as prisma } from "../src/lib/prisma.ts"
import * as XLSX from "xlsx"

const OUT_RAW = "galvelica-priority-raw.xlsx"
const META_FILE = "data/vndb-meta.json"
const TRANS_CACHE = "data/translate-cache.json"
const CURATED = "data/cn-names-curated.json"
const REVIEWS = "data/cn-community-reviews.json"
const STORE_LINKS = "data/store-links.json"
const RANK_BASE = "data/rank-base.json"

interface VndbMeta {
  zhHans?: string
  zhHant?: string
  ja?: string
  en?: string
  rating?: number | null
  votecount?: number | null
  popularity?: number | null
  length?: number | null
  released?: string | null
  languages?: string[]
  platforms?: string[]
  olang?: string | null
}

/** 值在已排序数组中的百分位 0-100 */
function pctRank(sorted: number[], v: number): number {
  if (!sorted.length) return 50
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < v) lo = mid + 1
    else hi = mid
  }
  return (lo / sorted.length) * 100
}

const HAS_KANA = /[぀-ヿ]/
const HAS_HANGUL = /[가-힯]/
const HAS_CYRILLIC = /[Ѐ-ӿ]/
const HAS_HAN = /[一-鿿]/
const isAscii = (s: string) => /^[\x00-\x7F]*$/.test(s)

const COUNTRY: Record<string, string> = {
  ja: "日本",
  en: "英语圈",
  ru: "俄语圈",
  uk: "乌克兰",
  zh: "中文",
  "zh-Hans": "简体中文圈",
  "zh-Hant": "繁体中文圈",
  ko: "韩国",
  es: "西班牙语圈",
  fr: "法语圈",
  de: "德语圈",
  "pt-br": "巴西",
  pl: "波兰",
  id: "印尼",
  it: "意大利",
  th: "泰国",
  cs: "捷克",
  vi: "越南",
  tr: "土耳其",
  ar: "阿拉伯语圈",
  hu: "匈牙利",
  hr: "克罗地亚",
  ta: "泰米尔语圈",
  nl: "荷兰",
  fi: "芬兰",
  bg: "保加利亚",
  kk: "哈萨克斯坦",
  he: "以色列",
  no: "挪威",
  ca: "加泰罗尼亚",
}

const PLATFORM: Record<string, string> = {
  win: "Windows",
  lin: "Linux",
  mac: "macOS",
  ios: "iOS",
  and: "Android",
  web: "网页",
  dvd: "DVD",
  bd: "蓝光",
  gba: "GBA",
  nds: "NDS",
  psp: "PSP",
  ps1: "PS1",
  ps2: "PS2",
  ps3: "PS3",
  ps4: "PS4",
  psv: "PSV",
  xb3: "Xbox360",
  switch: "Switch",
  dos: "DOS",
  sat: "SS",
  drc: "Dreamcast",
  wii: "Wii",
  wiu: "WiiU",
}

/** VNDB 内容体量 1-5 → 体量分；缺失回中位 45 */
const LENGTH_SCORE: Record<number, number> = { 1: 20, 2: 45, 3: 70, 4: 88, 5: 100 }
const LENGTH_LABEL: Record<number, string> = {
  1: "极短(2小时内)",
  2: "短(2-10小时)",
  3: "中等(10-30小时)",
  4: "长(30-50小时)",
  5: "超长(50小时以上)",
}

interface Item {
  slug: string
  vndbId: string
  m: VndbMeta
  title: string
  enName: string
  studio: string
  langs: string[]
  platforms: string[]
  olang: string
  year: number | null
  coverSexual: number
  isCommercial: boolean
  doujin: string
  status: string
  tagNames: string[]
  creators: string[]
  isNukige: boolean
  ratingVal: number | null
  voteVal: number
  rep: number
}

async function main() {
  if (!existsSync("data")) mkdirSync("data", { recursive: true })

  const meta: Record<string, VndbMeta> = existsSync(META_FILE)
    ? JSON.parse(readFileSync(META_FILE, "utf8"))
    : {}
  const transCache: Record<string, string> = existsSync(TRANS_CACHE)
    ? JSON.parse(readFileSync(TRANS_CACHE, "utf8"))
    : {}
  // 以 _ 开头的键是说明文字，不是作品 ID，统计和使用时都要排除
  const curated: Record<string, string> = existsSync(CURATED)
    ? Object.fromEntries(
        Object.entries(JSON.parse(readFileSync(CURATED, "utf8"))).filter(
          ([k, v]) => !k.startsWith("_") && typeof v === "string" && v.trim() !== "",
        ),
      )
    : {}
  const reviews: Record<string, { cnScore?: string; egsScore?: number; summary?: string; source?: string }> =
    existsSync(REVIEWS) ? JSON.parse(readFileSync(REVIEWS, "utf8")) : {}
  const stores: Record<
    string,
    { channels: string[]; urls: string[]; paid: boolean; freeOnly: boolean }
  > = existsSync(STORE_LINKS) ? JSON.parse(readFileSync(STORE_LINKS, "utf8")) : {}
  console.log(
    `VNDB 元数据 ${Object.keys(meta).length} 条，翻译缓存 ${Object.keys(transCache).length} 条，` +
      `人工核对 ${Object.keys(curated).length} 条，中文社区口碑 ${Object.keys(reviews).length} 条`,
  )

  // ── 1. 全量拉取 ──────────────────────────────────────────────
  const BATCH = 2000
  const works: any[] = []
  for (let skip = 0; ; skip += BATCH) {
    const rows = await prisma.work.findMany({
      skip,
      take: BATCH,
      select: {
        slug: true,
        title: true,
        englishName: true,
        studioName: true,
        releaseDate: true,
        rating: true,
        coverSexual: true,
        qualitySignal: true,
        coverDims: true,
        screenshots: true,
        languages: true,
        originalLanguage: true,
        isCommercial: true,
        doujinCategory: true,
        status: true,
        tags: { select: { tag: { select: { name: true } } } },
        creators: { select: { role: true, creator: { select: { name: true } } } },
        sources: { select: { externalId: true, source: true } },
      },
    })
    works.push(...rows)
    if (rows.length < BATCH) break
  }
  console.log("已拉取作品 =", works.length)

  // ── 2. 基础字段 ──────────────────────────────────────────────
  const items: Item[] = works.map((w) => {
    const src = (w.sources ?? []).find((s: any) => s.source === "VNDB")
    const m: VndbMeta = meta[src?.externalId ?? ""] ?? {}
    const sig: any = w.qualitySignal ?? {}
    const dims: any = w.coverDims ?? {}
    const tagNames: string[] = (w.tags ?? [])
      .map((t: any) => String(t.tag?.name ?? ""))
      .filter(Boolean)
    const langs: string[] = Array.isArray(w.languages) ? w.languages.map(String) : []
    const dbYear = w.releaseDate ? new Date(w.releaseDate).getFullYear() : null
    const mYear = m.released ? Number(String(m.released).slice(0, 4)) : null
    const year = mYear && mYear > 1980 && mYear < 2035 ? mYear : dbYear && dbYear > 1980 && dbYear < 2035 ? dbYear : null

    return {
      slug: String(w.slug ?? ""),
      vndbId: String(src?.externalId ?? ""),
      m,
      title: String(w.title ?? ""),
      enName: String(w.englishName ?? ""),
      studio: String(w.studioName ?? "").trim(),
      langs,
      platforms: (m.platforms ?? []).map(String),
      olang: String(m.olang ?? w.originalLanguage ?? ""),
      year,
      coverSexual: Number(w.coverSexual ?? -1),
      isCommercial: Boolean(w.isCommercial),
      doujin: String(w.doujinCategory ?? ""),
      status: String(w.status ?? ""),
      tagNames,
      creators: [...new Set((w.creators ?? []).map((c: any) => String(c.creator?.name ?? "").trim()).filter(Boolean))],
      isNukige: tagNames.includes("拔作"),
      ratingVal: m.rating ?? (w.rating as number | null),
      voteVal: Number(m.votecount ?? 0),
      rep: 50,
      // 以下为中间量，随对象透传
      _sig: sig,
      _coverPx: dims?.width && dims?.height ? Number(dims.width) * Number(dims.height) : null,
      _shotCount: Array.isArray(w.screenshots) ? w.screenshots.length : 0,
    } as Item & { _sig: any; _coverPx: number | null; _shotCount: number }
  })

  // ── 3. 口碑 30% ──────────────────────────────────────────────
  // VNDB 评分取分位后按投票数做置信收缩；无评分一律回中位 50。
  //
  // 这里刻意不用 VNDB 热度（popularity）参与评分：该值是 0-100 的贝叶斯估计，
  // 实测 99% 的作品低于 1（中位 0.007），绝大多数作品挤在 0 附近，既无区分度，
  // 又会把「冷门」当成「差评」，违背「缺失数据不惩罚」原则。故热度只作展示列。
  const K_VOTES = 30
  const ratingVals = items.map((i) => i.ratingVal).filter((v): v is number => v != null)
  const ratingSorted = [...ratingVals].sort((a, b) => a - b)
  for (const it of items) {
    if (it.ratingVal != null) {
      const w = it.voteVal / (it.voteVal + K_VOTES) // 票数越少越向中位回落，避免小样本刷榜
      it.rep = 50 * (1 - w) + pctRank(ratingSorted, it.ratingVal) * w
    }
  }
  const repReal = items.filter((i) => i.rep !== 50).length

  // ── 4. 整体质量 25% ──────────────────────────────────────────
  // qualityScore 是资料完整度，非作品好坏：剔除 rating 子项后取分位，再向中位收缩 30%。
  const withSig = (i: Item) => {
    const s = (i as any)._sig ?? {}
    return s && Object.keys(s).length > 0
  }
  const qualRaw = items.map((i) => {
    if (!withSig(i)) return null
    const s: any = (i as any)._sig
    return ((s.cover ?? 0) + (s.shots ?? 0) + (s.desc ?? 0) + (s.meta ?? 0)) / 72
  })
  const qualVals = qualRaw.filter((v): v is number => v != null)
  const qualSorted = [...qualVals].sort((a, b) => a - b)
  const qual = qualRaw.map((v) => (v == null ? 50 : 50 + (pctRank(qualSorted, v) - 50) * 0.7))

  // ── 5. 画风画面 15% ──────────────────────────────────────────
  const pxVals = items.map((i) => (i as any)._coverPx as number | null).filter((v): v is number => !!v && v > 0)
  const pxSorted = [...pxVals].sort((a, b) => a - b)
  const shotVals = items.map((i) => (i as any)._shotCount as number).filter((v) => v > 0)
  const shotSorted = [...shotVals].sort((a, b) => a - b)
  const pic = items.map((i) => {
    const px = (i as any)._coverPx as number | null
    const sh = (i as any)._shotCount as number
    const a = px && px > 0 ? pctRank(pxSorted, px) : 50
    const b = sh > 0 ? pctRank(shotSorted, sh) : 50
    return 0.5 * a + 0.5 * b
  })

  // ── 6. 内容体量 10% ──────────────────────────────────────────
  const vol = items.map((i) => (i.m.length != null ? (LENGTH_SCORE[i.m.length] ?? 45) : 45))

  // ── 7. 社团实力 15% ──────────────────────────────────────────
  const sAgg = new Map<string, { n: number; repSum: number }>()
  for (const i of items) {
    if (!i.studio) continue
    const a = sAgg.get(i.studio) ?? { n: 0, repSum: 0 }
    a.n += 1
    a.repSum += i.rep
    sAgg.set(i.studio, a)
  }
  // 用贝叶斯收缩把「作品少」拉回中位：只有 1 部作品的社团不该被判为弱，
  // 作品多且口碑高的社团才逐步向上走。K 越大越保守。
  const K_STUDIO = 3
  const sScore = new Map<string, number>()
  for (const [name, a] of sAgg) {
    const w = a.n / (a.n + K_STUDIO)
    sScore.set(name, 50 * (1 - w) + (a.repSum / a.n) * w)
  }

  // ── 8. 主创知名度 5% ─────────────────────────────────────────
  const cAgg = new Map<string, { n: number; repSum: number }>()
  for (const i of items) {
    for (const nm of i.creators) {
      const a = cAgg.get(nm) ?? { n: 0, repSum: 0 }
      a.n += 1
      a.repSum += i.rep
      cAgg.set(nm, a)
    }
  }
  // 同社团：参与作品越多，其历史口碑越可信；只挂过 1 部的主创回到中位，不倒扣
  const K_CREATOR = 3
  const cScore = new Map<string, number>()
  for (const [name, a] of cAgg) {
    const w = a.n / (a.n + K_CREATOR)
    cScore.set(name, 50 * (1 - w) + (a.repSum / a.n) * w)
  }

  // ── 9. 综合分 ────────────────────────────────────────────────
  const scored = items.map((it, idx) => {
    const st = it.studio ? (sScore.get(it.studio) ?? 50) : 50
    const cr = it.creators.length ? Math.max(...it.creators.map((n) => cScore.get(n) ?? 50)) : 50
    let sc = 0.3 * it.rep + 0.25 * qual[idx] + 0.15 * pic[idx] + 0.15 * st + 0.1 * vol[idx] + 0.05 * cr
    if (it.isNukige) sc -= 15
    return { it, st, cr, qual: qual[idx], pic: pic[idx], vol: vol[idx], sc }
  })
  scored.sort((a, b) => b.sc - a.sc)

  const total = scored.length
  const tier = (i: number) => {
    const p = (i + 1) / total
    return p <= 0.02 ? "S" : p <= 0.1 ? "A" : p <= 0.3 ? "B" : p <= 0.6 ? "C" : "D"
  }

  // ── 10. 组装行 ───────────────────────────────────────────────
  const rows = scored.map((s, i) => {
    const it = s.it
    const m = it.m
    const jaName = m.ja || (HAS_KANA.test(it.title) ? it.title : it.title)
    const enName = m.en || it.enName
    const isZhOrigin = it.olang.startsWith("zh")

    let cnName = ""
    let cnSource = ""
    if (m.zhHans) {
      cnName = m.zhHans
      cnSource = "官方中文(简)"
    } else if (m.zhHant) {
      cnName = m.zhHant
      cnSource = "官方中文(繁)"
    } else if (curated[it.vndbId]) {
      // 人工核对：机器翻译常把知名作品的约定译名翻错，头部作品优先用校正值
      cnName = curated[it.vndbId]
      cnSource = "人工核对"
    } else if (isZhOrigin && HAS_HAN.test(it.title)) {
      cnName = it.title
      cnSource = "原中文标题"
    } else {
      const cached = transCache[it.title] ?? transCache[jaName] ?? transCache[enName]
      if (cached) {
        cnName = cached
        // 专名类标题（Lucid9、Scarlet Hollow 等）翻译引擎会原样返回，
        // 这类如实标为「原名直录」，不冒充译名
        cnSource =
          cached === it.title || cached === jaName || cached === enName ? "原名直录" : "机器翻译"
      } else {
        cnName = ""
        cnSource = "待译"
      }
    }

    const langs = it.langs.length ? it.langs : (m.languages ?? [])
    const hasZh = langs.some((l) => String(l).toLowerCase().startsWith("zh"))
    const rv = reviews[it.vndbId]
    const st = stores[it.vndbId]
    const 获取方式 = st ? (st.freeOnly ? "免费" : st.paid ? "付费" : "含免费渠道") : ""

    return {
      排名: i + 1,
      梯队: tier(i),
      中文名: cnName || "（待译）",
      中文名来源: cnSource,
      日文原名: jaName,
      英文名: enName,
      综合分: Number(s.sc.toFixed(2)),
      口碑分: Number(it.rep.toFixed(1)),
      质量分: Number(s.qual.toFixed(1)),
      画面分: Number(s.pic.toFixed(1)),
      社团分: Number(s.st.toFixed(1)),
      体量分: Number(s.vol.toFixed(1)),
      主创分: Number(s.cr.toFixed(1)),
      国家地区: COUNTRY[it.olang] || it.olang || "未标",
      社团会社: it.studio,
      核心主创: it.creators.slice(0, 3).join(" / "),
      作品性质: it.isCommercial
        ? "商业作"
        : it.doujin === "PURE"
          ? "纯同人"
          : it.doujin === "DERIVATIVE"
            ? "商业同人"
            : "未定",
      是否拔作: it.isNukige ? "是" : "",
      内容分级:
        it.coverSexual === 2 ? "露骨" : it.coverSexual === 1 ? "暗示" : it.coverSexual === 0 ? "安全" : "未标",
      // VNDB 原始评分是 0-100 量纲，换算成通用的 0-10 分制便于阅读
      VNDB评分: it.ratingVal != null ? Number((it.ratingVal / 10).toFixed(2)) : "",
      VNDB票数: it.voteVal || "",
      VNDB热度: m.popularity ?? "",
      体量档位: m.length != null ? (LENGTH_LABEL[m.length] ?? "") : "",
      发售年: it.year ?? "",
      平台: it.platforms.map((p) => PLATFORM[p] || p).join("、"),
      支持语言: langs.map((l) => COUNTRY[l] || l).join("、"),
      有中文版: hasZh ? "是" : "否",
      // 中文社区 / 批评空间口碑：只填公开检索到的，查不到就留空，不编造
      中文社区评分: rv?.cnScore ?? "",
      批评空间中央值: rv?.egsScore ?? "",
      口碑摘要: rv?.summary ?? "",
      口碑来源: rv?.summary ? (rv.source ?? "") : "",
      // 获取途径：VNDB release 外链里真正的销售平台与官网，已滤掉资料站
      获取方式,
      获取渠道: st ? st.channels.join(" / ") : "",
      获取链接: st ? st.urls[0] ?? "" : "",
      题材标签: it.tagNames.slice(0, 6).join("、"),
      状态: it.status,
      VNDB编号: it.vndbId,
      副站链接: it.slug ? `https://circleica.com/galvelica/works/${it.slug}` : "",
    }
  })

  // ── 11. 待译清单（按优先级排序）──────────────────────────────
  const needTrans = rows
    .filter((r) => r.中文名来源 === "待译")
    .map((r) => {
      const text = r.日文原名 || r.英文名 || ""
      let lang = "ja"
      if (isAscii(text)) lang = "en"
      else if (HAS_HANGUL.test(text)) lang = "ko"
      else if (HAS_CYRILLIC.test(text)) lang = "ru"
      return { rank: r.排名, text, lang }
    })
    .filter((x) => x.text.length > 0)
  writeFileSync(RANK_BASE, JSON.stringify(needTrans))
  console.log(`待译 ${needTrans.length} 条 → ${RANK_BASE}`)

  // ── 12. 写 xlsx ──────────────────────────────────────────────
  const WIDE = new Set([
    "中文名",
    "日文原名",
    "英文名",
    "日文原名",
    "社团会社",
    "核心主创",
    "题材标签",
    "支持语言",
    "副站链接",
    "代表作",
    "口碑摘要",
    "口碑来源",
    "获取渠道",
    "获取链接",
    "说明",
    "项目",
  ])

  const wb = XLSX.utils.book_new()
  const sheet = (data: Record<string, unknown>[], name: string, wide = WIDE) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const keys = data.length ? Object.keys(data[0]) : []
    const sample = data.length > 4000 ? data.slice(0, 4000) : data
    ws["!cols"] = keys.map((k) => {
      let max = String(k).length
      for (const r of sample) {
        const v = String(r[k] ?? "")
        const w = [...v].reduce((s, ch) => s + (/[ᄀ-鿿＀-￯]/.test(ch) ? 2 : 1), 0)
        if (w > max) max = w
      }
      const cap = wide.has(k) ? 34 : 18
      return { wch: Math.max(6, Math.min(max + 2, cap)) }
    })
    if (data.length) {
      ws["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { c: 0, r: 0 },
          e: { c: Math.max(0, keys.length - 1), r: data.length },
        }),
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  sheet(rows, "总排名")
  sheet(
    rows.filter((r) => r.梯队 === "S" || r.梯队 === "A"),
    "精品S+A",
  )
  const nuk = rows.filter((r) => r.是否拔作 === "是")
  sheet(nuk, "纯拔作")

  // ── 分组汇总：国家 / 年代 / 社团共用同一套统计口径 ─────────────
  interface GroupAgg {
    n: number
    sa: number
    sum: number
    rated: number
    ratingSum: number
    zh: number
    cnNamed: number
    nuk: number
    top: { score: number; name: string }[]
  }
  const newAgg = (): GroupAgg => ({
    n: 0,
    sa: 0,
    sum: 0,
    rated: 0,
    ratingSum: 0,
    zh: 0,
    cnNamed: 0,
    nuk: 0,
    top: [],
  })

  function accumulate(a: GroupAgg, r: (typeof rows)[number]) {
    a.n += 1
    if (r.梯队 === "S" || r.梯队 === "A") a.sa += 1
    a.sum += r.综合分
    if (typeof r.VNDB评分 === "number") {
      a.rated += 1
      a.ratingSum += r.VNDB评分
    }
    if (r.有中文版 === "是") a.zh += 1
    if (r.中文名来源 !== "待译") a.cnNamed += 1
    if (r.是否拔作 === "是") a.nuk += 1
    // 待译的用原名占位，保证代表作一列不会空着
    a.top.push({
      score: r.综合分,
      name: r.中文名来源 === "待译" ? String(r.日文原名 ?? r.英文名 ?? "") : String(r.中文名),
    })
    if (a.top.length > 6) {
      a.top.sort((x, y) => y.score - x.score)
      a.top.length = 3
    }
  }

  function toGroupRow(
    keyLabel: string,
    key: string | number,
    a: GroupAgg,
    extra?: Record<string, unknown>,
  ) {
    const tops = [...a.top].sort((x, y) => y.score - x.score).slice(0, 3)
    return {
      [keyLabel]: key,
      作品数: a.n,
      全库占比: ((a.n / rows.length) * 100).toFixed(1) + "%",
      精品数: a.sa,
      精品率: ((a.sa / a.n) * 100).toFixed(1) + "%",
      平均综合分: Number((a.sum / a.n).toFixed(2)),
      有评分作品数: a.rated,
      平均分: a.rated ? Number((a.ratingSum / a.rated).toFixed(2)) : "",
      有中文版数: a.zh,
      中文占比: ((a.zh / a.n) * 100).toFixed(1) + "%",
      有中文名数: a.cnNamed,
      拔作数: a.nuk,
      拔作占比: ((a.nuk / a.n) * 100).toFixed(1) + "%",
      代表作: tops.map((t) => t.name).join("、"),
      ...extra,
    }
  }

  const ctry = new Map<string, GroupAgg>()
  const yAgg = new Map<number, GroupAgg>()
  const studioAgg = new Map<string, GroupAgg>()
  const yearList: number[] = []
  for (const r of rows) {
    const c = String(r.国家地区 || "未标")
    const ca = ctry.get(c) ?? newAgg()
    accumulate(ca, r)
    ctry.set(c, ca)

    if (typeof r.发售年 === "number") {
      const ya = yAgg.get(r.发售年) ?? newAgg()
      accumulate(ya, r)
      yAgg.set(r.发售年, ya)
      yearList.push(r.发售年)
    }

    const st = String(r.社团会社 ?? "").trim()
    if (st) {
      const sa2 = studioAgg.get(st) ?? newAgg()
      accumulate(sa2, r)
      studioAgg.set(st, sa2)
    }
  }

  sheet(
    [...ctry.entries()]
      .map(([c, a]) => toGroupRow("国家地区", c, a))
      .sort((x, y) => y.作品数 - x.作品数),
    "国家汇总",
  )

  // 年代表额外给一栏累计值，方便看某个时间点之前库里攒了多少作品
  const cum = new Map<number, number>()
  let running = 0
  for (const y of [...yAgg.keys()].sort((a, b) => a - b)) {
    running += yAgg.get(y)!.n
    cum.set(y, running)
  }
  sheet(
    [...yAgg.entries()]
      .map(([y, a]) => toGroupRow("发售年", y, a, { 累计作品数: cum.get(y) ?? 0 }))
      .sort((x, y) => Number(y.发售年) - Number(x.发售年)),
    "年代汇总",
  )

  const sAggRows = [...studioAgg.entries()]
    .map(([name, a]) =>
      toGroupRow("社团会社", name, a, {
        平均口碑分: Number(((sAgg.get(name)?.repSum ?? 0) / a.n).toFixed(1)),
        社团实力分: Number((sScore.get(name) ?? 0).toFixed(1)),
      }),
    )
    .sort((x, y) => Number(y.社团实力分) - Number(x.社团实力分) || y.作品数 - x.作品数)
  sheet(sAggRows, "社团汇总")

  // ── 附表：知名商业作（副站只收录同人，这些不在库内）──────────────
  // 主表每一行都对应网站数据库里的 Work 记录；下面这些是检索口碑时遇到的知名作品，
  // 但均为商业会社出品，按副站「同人资料馆」的定位不收录，所以单列一张附表，
  // 方便对照查阅，绝不与主表混为一谈。
  const COMMERCIAL: {
    中文名: string
    原名: string
    会社: string
    性质: string
    Bangumi: string
    批评空间: string
    口碑摘要: string
    为何不在主表: string
  }[] = [
    {
      中文名: "兰斯10",
      原名: "ランス10 -決戦-",
      会社: "ALICESOFT",
      性质: "商业作",
      Bangumi: "9.2",
      批评空间: "99",
      口碑摘要: "批评空间中央值 99 分，长期位居各类日式评分榜首，Bangumi 9.2 分",
      为何不在主表: "ALICESOFT 为商业会社，非同人社团",
    },
    {
      中文名: "白色相簿2 终章",
      原名: "WHITE ALBUM 2 -closing chapter-",
      会社: "Leaf / Aqua Plus",
      性质: "商业作",
      Bangumi: "",
      批评空间: "94",
      口碑摘要: "批评空间中央值 94 分，丸户史明剧本代表作，中文圈常以「白学」讨论其三角关系",
      为何不在主表: "Leaf 为商业品牌",
    },
    {
      中文名: "Muv-Luv Alternative",
      原名: "マブラヴ オルタネイティヴ",
      会社: "âge",
      性质: "商业作",
      Bangumi: "8.9",
      批评空间: "93",
      口碑摘要: "批评空间 93 分、Bangumi 8.9，中文社区公认的泣系名作",
      为何不在主表: "âge 为商业会社",
    },
    {
      中文名: "在世界尽头咏唱恋曲的少女YU-NO",
      原名: "この世の果てで恋を唄う少女YU-NO",
      会社: "ELF",
      性质: "商业作",
      Bangumi: "8.7",
      批评空间: "93",
      口碑摘要: "1996 年经典，批评空间 93 分，中文圈视为多世界线叙事的早期范本",
      为何不在主表: "ELF 为商业会社",
    },
    {
      中文名: "Ever17 -the out of infinity-",
      原名: "Ever17 -the out of infinity-",
      会社: "KID",
      性质: "商业作",
      Bangumi: "9.1",
      批评空间: "91",
      口碑摘要: "Bangumi 9.1 分，长期位居中文 galgame 评分榜前列，以叙述性诡计与时间循环著称",
      为何不在主表: "KID 为商业会社",
    },
    {
      中文名: "CLANNAD",
      原名: "CLANNAD",
      会社: "Key / Visual Art's",
      性质: "商业作",
      Bangumi: "8.9",
      批评空间: "90",
      口碑摘要: "Key 社代表作，中文圈知名度最高的催泪系作品之一",
      为何不在主表: "Key 为商业品牌",
    },
    {
      中文名: "樱之诗 在樱花之森上飞舞",
      原名: "サクラノ詩 -櫻の森の上を舞う-",
      会社: "KeroQ（枕）",
      性质: "商业作",
      Bangumi: "9.1",
      批评空间: "",
      口碑摘要: "Bangumi 9.1 分，曾长期是中文 galgame 评分榜第一，以美术与哲学性文本著称",
      为何不在主表: "KeroQ 为商业品牌",
    },
    {
      中文名: "CROSS†CHANNEL",
      原名: "CROSS†CHANNEL",
      会社: "FlyingShine",
      性质: "商业作",
      Bangumi: "8.6",
      批评空间: "90",
      口碑摘要: "电波系文本与 loop 结构，核心圈层内评价极高",
      为何不在主表: "FlyingShine 为商业会社",
    },
    {
      中文名: "装甲恶鬼村正",
      原名: "装甲悪鬼村正",
      会社: "Nitroplus",
      性质: "商业作",
      Bangumi: "8.5",
      批评空间: "90",
      口碑摘要: "中文社区称其剧本厚度与设定完成度极高",
      为何不在主表: "Nitroplus 为商业会社",
    },
    {
      中文名: "交响乐之雨",
      原名: "シンフォニック=レイン",
      会社: "Kogado Studio",
      性质: "商业作",
      Bangumi: "8.5",
      批评空间: "90",
      口碑摘要: "以音乐题材与歌唱演出见长",
      为何不在主表: "Kogado Studio 为商业会社",
    },
    {
      中文名: "战国兰斯",
      原名: "戦国ランス",
      会社: "ALICESOFT",
      性质: "商业作",
      Bangumi: "",
      批评空间: "90",
      口碑摘要: "兰斯系列中口碑最高的一作，SLG 与 AVG 结合",
      为何不在主表: "ALICESOFT 为商业会社",
    },
    {
      中文名: "MUSICUS!",
      原名: "MUSICUS!",
      会社: "OVERDRIVE",
      性质: "商业作",
      Bangumi: "8.6",
      批评空间: "",
      口碑摘要: "中文社区评价其群像剧与音乐产业题材扎实",
      为何不在主表: "OVERDRIVE 为商业品牌",
    },
    {
      中文名: "Summer Pockets",
      原名: "Summer Pockets",
      会社: "Key",
      性质: "商业作",
      Bangumi: "8.6",
      批评空间: "",
      口碑摘要: "Key 社作品，中文圈评价为「泣系但节奏偏慢」",
      为何不在主表: "Key 为商业品牌",
    },
    {
      中文名: "十三机兵防卫圈",
      原名: "十三機兵防衛圏",
      会社: "Vanillaware / Atlus",
      性质: "商业作（主机游戏）",
      Bangumi: "8.9",
      批评空间: "",
      口碑摘要: "群像科幻叙事，中文圈口碑极高",
      为何不在主表: "主机平台商业作，既非同人也非 PC 视觉小说",
    },
    {
      中文名: "大逆转裁判2 成步堂龙之介的觉悟",
      原名: "大逆転裁判2 -成歩堂龍ノ介の覺悟-",
      会社: "Capcom",
      性质: "商业作（主机游戏）",
      Bangumi: "8.9",
      批评空间: "",
      口碑摘要: "法庭推理题材，中文圈评价好",
      为何不在主表: "主机平台商业作",
    },
  ]
  sheet(COMMERCIAL, "附表 知名商业作(不在库内)", new Set(["中文名", "原名", "会社", "口碑摘要", "为何不在主表"]))

  // ── 附表：库内被标为商业作的作品 ──────────────────────────────
  // 这些作品数据库里是存在的，只是 VNDB 的 producer type 把它们标成了 co（会社）。
  // 按「只收录同人」的口径本该留意，但你说了不从主表排除，所以单列一张附表备查。
  //
  // 注意一个容易踩的坑：VNDB 的 producer 列表里开发方和发行方是混在一起的。
  // 同人社团的作品一旦被商业公司代理发行或移植，商业公司也会出现在 producer 里，
  // 于是整部作品被标成商业作——但原作本身仍是同人。典型如 narcissu（Stage-nana 同人，
  // Regista 商业发行）、07th Expansion 的主机版（ENTERGRAM 发行）。
  // 所以「商业作」这个标记不等于「作品不是同人」，附表里按社团名拆分做了区分。
  const commercialInDb = rows
    .filter((r) => r.作品性质 === "商业作")
    .map((r) => {
      const studios = String(r.社团会社 ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      const multi = studios.length > 1
      return {
        排名: r.排名,
        梯队: r.梯队,
        中文名: r.中文名,
        日文原名: r.日文原名,
        社团会社: r.社团会社,
        国家地区: r.国家地区,
        综合分: r.综合分,
        VNDB评分: r.VNDB评分,
        标记来源: "VNDB producer type = co",
        标记说明: multi
          ? `社团字段含 ${studios.length} 个参与方（${studios.join(" / ")}），可能是同人原作 + 商业发行/移植并存`
          : `单一参与方「${studios[0] ?? "—"}」，VNDB 将其标记为商业会社`,
        VNDB编号: r.VNDB编号,
      }
    })
  sheet(
    commercialInDb,
    "附表 库内商业标记作品",
    new Set(["中文名", "日文原名", "社团会社", "标记说明"]),
  )

  // ── 免费可获取清单：全部渠道都免费，不用花钱就能拿到 ─────────────
  const freeList = rows
    .filter((r) => r.获取方式 === "免费")
    .map((r) => ({
      排名: r.排名,
      梯队: r.梯队,
      中文名: r.中文名,
      日文原名: r.日文原名,
      社团会社: r.社团会社,
      国家地区: r.国家地区,
      综合分: r.综合分,
      获取渠道: r.获取渠道,
      获取链接: r.获取链接,
      VNDB编号: r.VNDB编号,
    }))
  sheet(freeList, "免费可获取", new Set(["中文名", "日文原名", "社团会社", "获取渠道", "获取链接"]))

  const cnOfficial = rows.filter((r) => r.中文名来源.startsWith("官方中文")).length
  const cnOrigin = rows.filter((r) => r.中文名来源 === "原中文标题").length
  const cnCurated = rows.filter((r) => r.中文名来源 === "人工核对").length
  const cnMt = rows.filter((r) => r.中文名来源 === "机器翻译").length
  const cnRaw = rows.filter((r) => r.中文名来源 === "原名直录").length
  const guide = [
    { 项目: "生成时间", 说明: new Date().toLocaleString("zh-CN") },
    {
      项目: "覆盖范围",
      说明: `副站全库 ${rows.length} 部，一部不漏。总表不做任何预过滤，拔作与成人作品都在里面，需要筛什么请点表头筛选器自己开，脚本不会替你决定。`,
    },
    {
      项目: "收录口径",
      说明: `副站是「同人视觉小说资料馆」，只收录同人作品。主表每一行都对应网站数据库里已存在的作品记录（${rows.length} 部）。检索口碑时遇到的知名商业作（CLANNAD、Ever17、兰斯10 等）按口径不收录，已单列在「附表 知名商业作(不在库内)」。`,
    },
    {
      项目: "关于「商业作」标记",
      说明: `主表里有 ${rows.filter((r) => r.作品性质 === "商业作").length} 部被 VNDB 标为商业作，未作排除，另列「附表 库内商业标记作品」备查。这个标记不等于「作品不是同人」：VNDB 的 producer 列表把开发方和发行方混在一起，同人作品一旦被商业公司代理发行或移植，就会被连坐标成商业作（如 narcissu 由 Stage-nana 同人开发、Regista 商业发行）。判断时请以社团字段为准。`,
    },
    {
      项目: "综合分公式",
      说明: "口碑30% + 整体质量25% + 画风画面15% + 社团实力15% + 内容体量10% + 主创知名度5%。口碑权重最高。",
    },
    {
      项目: "口碑 30%",
      说明: `VNDB 评分取分位，再按投票数做置信收缩：票数越少越向中位回落，避免小样本虚高；无评分一律取中位 50。全库有口碑实据 ${repReal} 部。注意：热度（popularity）刻意不参与评分——它 99% 的作品都低于 1，没有区分度，还会把冷门当差评，只留在表里当参考。`,
    },
    {
      项目: "整体质量 25%",
      说明:
        "qualityScore 衡量的是资料完整度而不是作品好不好。这里先剔除其中 rating 子项（避免与口碑重复计分），再取分位并向中位收缩 30%，用来缓解「资料少的好作品被压低」。库内没有独立的质量真值，这一列只能算代理指标。",
    },
    {
      项目: "画风画面 15%",
      说明: "库内没有画风评分。本列用「封面像素数 + 截图数量」作为画面制作规格的代理，缺失回到中位。",
    },
    { 项目: "社团实力 15%", 说明: "该社团历史作品的平均口碑，按作品数做贝叶斯收缩：作品越多越可信，只出过 1 部或没有社团信息的回到中位 50，不因为「社团小」倒扣。" },
    { 项目: "内容体量 10%", 说明: "VNDB length 1-5 档映射为 20/45/70/88/100，缺失取中位 45。" },
    { 项目: "主创知名度 5%", 说明: "主创历史作品的平均口碑，同样按参与作品数做贝叶斯收缩；无主创信息取中位 50。" },
    { 项目: "缺失不惩罚", 说明: "任一维度缺失一律回到中位 50，绝不因为「没数据」把作品压到末尾漏掉。" },
    {
      项目: "18+ 一视同仁",
      说明: "成人作品不降权、不排除、不单独归到差的堆里，只在「内容分级」列如实标记安全/暗示/露骨。很多成人作品非常优秀，不能以偏概全。公式里不存在任何与成人内容相关的扣分项。",
    },
    {
      项目: "纯拔作例外",
      说明: `命中「拔作」标签的 ${nuk.length} 部综合分 -15 往后排，并单独出「纯拔作」分表；总表里仍然保留不删。`,
    },
    {
      项目: "中文名来源",
      说明: `官方中文名 ${cnOfficial} 部、人工核对 ${cnCurated} 部、原语言即中文 ${cnOrigin} 部、机器翻译 ${cnMt} 部、原名直录 ${cnRaw} 部、待译 ${needTrans.length} 部。人工核对用于纠正机器翻译在知名作品上翻错的约定译名。「原名直录」指专名类标题（Lucid9、Scarlet Hollow 这类）翻译引擎原样返回，本就没有中文译名，如实标注不冒充。待译项按排名先后推进，重跑翻译脚本再生成一次即可继续补全。`,
    },
    {
      项目: "获取途径",
      说明: `从 VNDB 的 release（发售版本）外链批量抓取，已滤掉 ErogameScape、Wikipedia 这类资料站，只留销售平台与官网。全库 ${Object.keys(stores).length} 部拿到渠道（${((Object.keys(stores).length / rows.length) * 100).toFixed(1)}%），其中全部渠道免费的 ${freeList.length} 部已单列在「免费可获取」表。注意：DLsite / Steam / Getchu / DMM 等是付费购买平台，不是免费下载；真正零成本的只有免费那一档。`,
    },
    {
      项目: "已知局限",
      说明: "库内收藏数与浏览量均为 0，未参与计算。Bangumi、月幕、DLsite、Getchu、ErogameScape 等源当前无数据，口碑只能以 VNDB 单源为主，其余平台评价暂无法核实。",
    },
  ]
  sheet(guide, "评分说明", new Set(["项目", "说明"]))

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true })
  writeFileSync(OUT_RAW, buf)
  console.log(`\n已生成 ${OUT_RAW}（${(buf.length / 1048576).toFixed(1)} MB）`)
  console.log(
    `总排名 ${rows.length} | 精品S+A ${rows.filter((r) => r.梯队 === "S" || r.梯队 === "A").length} | 纯拔作 ${nuk.length}`,
  )
  console.log(
    `中文名：官方 ${cnOfficial} / 人工核对 ${cnCurated} / 原中文 ${cnOrigin} / 机翻 ${cnMt} / 原名直录 ${cnRaw} / 待译 ${needTrans.length}`,
  )
}

main()
  .catch((e) => console.error("失败:", e))
  .finally(() => prisma.$disconnect().catch(() => {}))
