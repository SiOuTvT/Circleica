import { chromium } from "playwright"

const BASE = "http://localhost:3000"
const URL = BASE + "/galvelica/works"

/** 读取作品库「共 N 部作品」 */
async function readTotal(page) {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 })
  // dev 下首次访问要编译，给足时间；不用 networkidle（长连接会让它一直不满足）
  await page
    .waitForFunction(() => /共\s*\d+\s*部作品/.test(document.body.innerText), { timeout: 120000 })
    .catch(() => {})
  const t = await page.innerText("body")
  const m = t.match(/共\s*([\d,]+)\s*部作品/)
  return m ? Number(m[1].replace(/,/g, "")) : null
}

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

// 预热：触发 dev 首次编译
await page.goto(BASE + "/galvelica", { waitUntil: "domcontentloaded", timeout: 120000 }).catch(() => {})

// ① 默认（商业作显示 = 全库口径；真人/无封面只降权不过滤，应明显多于旧的 1.7 万）
const showAll = await readTotal(page)
console.log("① 默认（显示商业作，真人不过滤）总数 =", showAll)

// ② 开「隐藏商业作」开关（cookie gal_commercial=0）
await ctx.addCookies([
  { name: "gal_commercial", value: "0", domain: "localhost", path: "/" },
])
const hideCommercial = await readTotal(page)
console.log("② 隐藏商业作后总数 =", hideCommercial)

console.log("   差值（应≈173 商业作数）=", showAll != null && hideCommercial != null ? showAll - hideCommercial : "N/A")
console.log(
  "   缓存是否串号 =",
  showAll != null && hideCommercial != null && showAll !== hideCommercial
    ? "否（两种口径各自独立）✓"
    : "是（切换后总数未变，缓存串号）✗",
)

await browser.close()
