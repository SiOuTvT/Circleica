/**
 * 副站作品优先级表格（最终版，含中文标题与完善后的国家表）。
 *
 * 输出：galvelica-priority-final.xlsx
 *   sheet: 总排名 / 精品(S+A) / 纯拔作 / 社团汇总 / 按国家汇总 / 评分说明
 *
 * 关键设计：
 *  - 综合分 = 口碑30% + 质量25% + 画面15% + 社团15% + 体量10% + 主创5%
 *    （口碑权重最高，符合「网络评价优先」的要求）
 *  - 口碑缺失(82%)取中位50，绝不惩罚 → 好作品不会被埋
 *  - 18+ 与全年龄一视同仁，不降权不排除，仅「内容分级」列标记
 *  - 命中「拔作」标签 → -15 分往后排 + 单独分表
 *  - 标题翻译走项目自带 /api/translate（MyMemory→LibreTranslate→Google）
 *    限速 6.6s/次，结果落盘缓存，可断点续跑
 *  - 国家表：完整语言码→国家/地区；并新增「有中文版」列
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs"
import { chromium } from "playwright"

// 显式加载 .env：独立脚本运行时不会走 Next 的环境加载，
// 否则 Prisma 会退回 placeholder 连接串（28P01 认证失败）。
for (const line of (existsSync(".env") ? readFileSync(".env", "utf8") : "").split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
}

const { realPrisma: prisma } = await import("../src/lib/prisma")
const XLSX = await import("xlsx")

const BASE = "http://localhost:3000"
const TRANSLATE_TOP = Number(process.env.TRANSLATE_TOP ?? "300")
const CACHE_FILE = "translate-cache.json"

/** 值在 sorted 中的百分位 0-100 */
function pctRank(sorted: number[], v: number): number {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < v) lo = mid + 1
    else hi = mid
  }
  return (lo / sorted.length) * 100
}

/** 语言码 → 国家/地区 */
const COUNTRY: Record<string, string> = {
  ja: "日本",
  en: "英语圈",
  ru: "俄语圈",
  zh: "中文",
  "zh-Hans": "简体中文圈",
  "zh-Hant": "繁体中文圈",
  ko: "韩国",
  es: "西班牙语圈",
  uk: "乌克兰",
  fr: "法语圈",
  "pt-br": "巴西",
  pl: "波兰",
  id: "印尼",
  it: "意大利",
  th: "泰国",
  cs: "捷克",
  de: "德语圈",
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

async function main() {
  // ── 1. 全量拉取 ──────────────────────────────────────────
  const BATCH = 2000
  const all: any[] = []
  for (let skip = 0; ; skip += BATCH) {
    const rows = await prisma.work.findMany({
      skip,
      take: BATCH,
      select: {
        slug: true,
        title: true,
        englishName: true,
        originalWork: true,
        studioName: true,
        releaseDate: true,
        duration: true,
        rating: true,
        ratingCount: true,
        coverSexual: true,
        qualityScore: true,
        qualitySignal: true,
        coverImage: true,
        screenshots: true,
        languages: true,
        originalLanguage: true,
        isCommercial: true,
        doujinCategory: true,
        status: true,
        tags: { select: { tag: { select: { name: true } } } },
        creators: { select: { role: true, creator: { select: { name: true } } } },
      },
    })
    all.push(...rows)
    if (rows.length < BATCH) break
  }
  console.log("已拉取作品数 =", all.length)

  // ── 2. 社团聚合 ──────────────────────────────────────────
  const sAgg = new Map<string, { n: number; sum: number; high: number }>()
  for (const w of all) {
    const s = String(w.studioName ?? "").trim()
    if (!s) continue
    const a = sAgg.get(s) ?? { n: 0, sum: 0, high: 0 }
    a.n += 1
    a.sum += w.qualityScore ?? 0
    if ((w.qualityScore ?? 0) >= 70) a.high += 1
    sAgg.set(s, a)
  }
  const mN = Math.max(1, ...[...sAgg.values()].map((a) => a.n))
  const mA = Math.max(1, ...[...sAgg.values()].map((a) => a.sum / a.n))
  const mH = Math.max(1, ...[...sAgg.values()].map((a) => a.high))
  const sScore = new Map<string, number>()
  for (const [name, a] of sAgg) {
    const avg = a.sum / a.n
    sScore.set(name, (a.n / mN) * 20 + (avg / mA) * 50 + (a.high / mH) * 30)
  }
  const sRows = [...sAgg.entries()]
    .map(([name, a]) => ({
      社团: name,
      作品数: a.n,
      平均质量分: Number((a.sum / a.n).toFixed(1)),
      高分作数: a.high,
    }))
    .sort((x, y) => y.平均质量分 - x.平均质量分 || y.作品数 - x.作品数)

  // ── 3. 主创聚合 ─────────────────────────────────────────────
  const cAgg = new Map<string, { n: number; sum: number }>()
  for (const w of all) {
    for (const wc of w.creators ?? []) {
      const nm = String((wc as any).creator?.name ?? "").trim()
      if (!nm) continue
      const a = cAgg.get(nm) ?? { n: 0, sum: 0 }
      a.n += 1
      a.sum += w.qualityScore ?? 0
      cAgg.set(nm, a)
    }
  }
  const mCn = Math.max(1, ...[...cAgg.values()].map((a) => a.n))
  const mCa = Math.max(1, ...[...cAgg.values()].map((a) => a.sum / a.n))
  const cScore = new Map<string, number>()
  for (const [name, a] of cAgg) {
    const avg = a.sum / a.n
    cScore.set(name, (a.n / mCn) * 50 + (avg / mCa) * 50)
  }

  // 分位基准
  const qsSorted = [...all.map((w) => w.qualityScore ?? 0)].sort((a, b) => a - b)
  const rtVals = all.map((w) => w.rating).filter((v) => v != null) as number[]
  const rtSorted = [...rtVals].sort((a, b) => a - b)
  const picSorted = [
    ...all.map((w) => {
      const s: any = w.qualitySignal ?? {}
      return (s.cover ?? 0) + (s.shots ?? 0)
    }),
  ].sort((a, b) => a - b)
  const volSorted = [
    ...all.map((w) => {
      const sh = Array.isArray(w.screenshots) ? w.screenshots.length : 0
      const tg = Array.isArray(w.tags) ? w.tags.length : 0
      return sh + tg
    }),
  ].sort((a, b) => a - b)

  const rows = all.map((w) => {
    const sig: any = w.qualitySignal ?? {}
    const qs = w.qualityScore ?? 0
    const rt = w.rating as number | null
    const pic = (sig.cover ?? 0) + (sig.shots ?? 0)
    const sh = Array.isArray(w.screenshots) ? w.screenshots.length : 0
    const tagNames = (w.tags ?? []).map((t: any) => String(t.tag?.name ?? "")).filter(Boolean)
    const tg = tagNames.length
    const vol = sh + tg
    const studio = String(w.studioName ?? "").trim()
    const stSc = sScore.get(studio) ?? 0
    const cs = (w.creators ?? []).map(
      (wc: any) => cScore.get(String((wc as any).creator?.name ?? "").trim()) ?? 0,
    )
    const cV = cs.length ? Math.max(...cs) : 0
    const langs: string[] = Array.isArray(w.languages) ? w.languages : []
    const hasZh = langs.some((l: any) => String(l).toLowerCase().startsWith("zh"))
    const nukige = tagNames.includes("拔作")

    const items = [
      { v: qsSorted.length ? pctRank(qsSorted, qs) : 0, w: 0.25 },
      { v: rt != null && rtSorted.length ? pctRank(rtSorted, rt) : 50, w: 0.3 },
      { v: picSorted.length ? pctRank(picSorted, pic) : 0, w: 0.15 },
      { v: stSc, w: 0.15 },
      { v: cV, w: 0.1 },
      { v: volSorted.length ? pctRank(volSorted, vol) : 0, w: 0.05 },
    ]
    const wSum = items.reduce((s, i) => s + i.w, 0)
    let sc = items.reduce((s, i) => s + (i.v as number) * i.w, 0) / wSum
    if (nukige) sc -= 15

    return {
      排名: 0,
      梯队: "",
      中文名: String(w.title ?? ""),
      日文原名: String(w.originalWork ?? ""),
      英文名: String(w.englishName ?? ""),
      国家地区: COUNTRY[String(w.originalLanguage ?? "")] || String(w.originalLanguage ?? "未标"),
      原语言码: String(w.originalLanguage ?? ""),
      有中文版: hasZh ? "是" : "否",
      社团: studio,
      综合分: Number(sc.toFixed(2)),
      质量分: qs,
      口碑分: rt ?? "",
      画面分: pic,
      体量分: vol,
      社团分: Number(stSc.toFixed(1)),
      主创分: Number(cV.toFixed(1)),
      核心主创: (w.creators ?? []).slice(0, 4).map((wc: any) => `${wc.role}:${wc.creator?.name}`).join(" / "),
      作品性质: w.isCommercial
        ? "商业作"
        : w.doujinCategory === "PURE"
          ? "纯同人"
          : w.doujinCategory === "DERIVATIVE"
            ? "商业同人"
            : "未定",
      是否拔作: nukige ? "是" : "",
      内容分级:
        w.coverSexual === 2 ? "露骨" : w.coverSexual === 1 ? "暗示" : w.coverSexual === 0 ? "安全" : "未标",
      状态: String(w.status ?? ""),
      年代: w.releaseDate ? new Date(w.releaseDate).getFullYear() : "",
      时长: String(w.duration ?? ""),
      标签数: tg,
      截图数: sh,
      封面: w.coverImage ? "有" : "无",
      题材标签: tagNames.slice(0, 5).join("、"),
      slug: String(w.slug ?? ""),
      中文译名: "",
    }
  })

  rows.sort((a, b) => b.综合分 - a.综合分)
  rows.forEach((r, i) => {
    r.排名 = i + 1
  })
  rows.forEach((r) => {
    const p = r.排名 / rows.length
    r.梯队 = p <= 0.02 ? "S" : p <= 0.1 ? "A" : p <= 0.3 ? "B" : p <= 0.6 ? "C" : "D"
  })

  // ── 4. 标题翻译（Top N，限速）─────────────────────────────
  let cache: Record<string, string> = {}
  try {
    if (existsSync(CACHE_FILE)) cache = JSON.parse(readFileSync(CACHE_FILE, "utf8"))
  } catch {
    cache = {}
  }

  const targets = rows
    .filter((r) => /[぀-ヿ]/.test(String(r.中文名)))
    .slice(0, TRANSLATE_TOP)

  console.log(`\n=== 开始翻译 Top ${targets.length} 部（间隔 6.6s，遵守 10 次/分钟限流）===`)

  const browser = await chromium.launch()
  const page = await (await browser.newContext()).newPage()

  // 登录
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 120000 })
  await page.waitForTimeout(4000)
  const inputInfo = await page.$$eval("input", (els: any[]) =>
    els.map((e: any) => ({ type: e.type, ph: e.placeholder ?? "" })),
  )
  const pwdIdx = inputInfo.findIndex((i: any) => i.type === "password" || /密码|password/i.test(i.ph))
  const userIdx = inputInfo.findIndex((i: any, idx: number) => idx !== pwdIdx && i.type !== "hidden")
  await page.locator("input").nth(userIdx).fill(process.env.TEST_USER ?? "")
  await page.locator("input").nth(pwdIdx).fill(process.env.TEST_PASS ?? "")
  await page.locator("input").nth(pwdIdx).press("Enter")
  await page.waitForTimeout(10000)
  console.log("登录成功 =", !page.url().includes("/login"))

  let done = 0
  for (const r of targets) {
    const t = String(r.中文名)
    if (cache[t]) {
      r["中文译名"] = cache[t]
      continue
    }
    try {
      const out = await page.evaluate(async (text: string) => {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        })
        return await res.json()
      }, t.slice(0, 400))
      const tr = out?.data?.data?.translated
      if (tr) {
        cache[t] = tr
        r["中文译名"] = tr
        done += 1
      }
    } catch {
      /* 失败跳过 */
    }
    if (done % 10 === 0 && done) console.log(`  已翻 ${done}/${targets.length}`)
    await page.waitForTimeout(6600) // 限速：10 次/分钟
  }

  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
  console.log(`翻译完成，新增 ${done} 条，缓存总计 ${Object.keys(cache).length} 条`)

  // ── 5. 写 xlsx ───────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  function autosize(data: any[], name: string) {
    const ws = XLSX.utils.json_to_sheet(data)
    const keys = data.length ? Object.keys(data[0]) : []
    ws["!cols"] = keys.map((k) => {
      const max = Math.max(
        String(k).length,
        ...data.map((r) => String(r[k] ?? "").length),
      )
      return { wch: Math.min(52, Math.max(8, max + 2)) }
    })
    ws["!freeze"] = "A2"
    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  autosize(rows, "总排名")
  autosize(rows.filter((r) => r.梯队 === "S" || r.梯队 === "A"), "精品(S+A)")
  autosize(rows.filter((r) => r.是否拔作 === "是"), "纯拔作")
  autosize(sRows, "社团汇总")

  // 国家汇总：作品数 / 平均综合分 / 代表作 / 中文占比
  const ctryAgg = new Map<string, { n: number; sum: number; zh: number; top: any }>()
  for (const r of rows) {
    const c = String(r.国家地区 ?? "未标")
    const a = ctryAgg.get(c) ?? { n: 0, sum: 0, zh: 0, top: null }
    a.n += 1
    a.sum += r.综合分
    if (r.有中文版 === "是") a.zh += 1
    if (!a.top || r.综合分 > a.top.综合分) a.top = r
    ctryAgg.set(c, a)
  }
  const ctryRows = [...ctryAgg.entries()]
    .map(([c, a]) => ({
      国家地区: c,
      作品数: a.n,
      平均综合分: Number((a.sum / a.n).toFixed(2)),
      有中文版数: a.zh,
      中文占比: ((a.zh / a.n) * 100).toFixed(1) + "%",
      代表作: a.top?.中文名 ?? "",
    }))
    .sort((x, y) => y.作品数 - x.作品数)
  autosize(ctryRows, "按国家汇总")

  const guide = [
    { 项目: "生成时间", 说明: new Date().toLocaleString("zh-CN") },
    { 项目: "数据来源", 说明: "副站 Work 表；当前仅 VNDB 单源有数据，其余 7 源为空" },
    { 项目: "综合分公式", 说明: "口碑30% + 质量25% + 画面15% + 社团15% + 体量10% + 主创5%" },
    { 项目: "口碑缺失处理", 说明: "82% 无 rating → 取中位50，不惩罚，避免漏掉好作品" },
    { 项目: "18+ 处理", 说明: "与全年龄一视同仁：不降权、不排除，仅「内容分级」列标记" },
    { 项目: "拔作处理", 说明: "命中「拔作」标签 → 综合分 -15，往后排，并单独出分表" },
    { 项目: "已知局限", 说明: "热度(favoriteCount/viewCount)全为0，未参与排序" },
  ]
  autosize(guide, "评分说明")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  writeFileSync("galvelica-priority-final.xlsx", buf)
  console.log("已生成 galvelica-priority-final.xlsx，行数 =", rows.length)
}

main()
  .catch((e) => console.error("失败:", e.message))
  .finally(() => prisma.$disconnect().catch(() => {}))
