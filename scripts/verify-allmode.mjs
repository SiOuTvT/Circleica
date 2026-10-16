/**
 * 验证：登录后切到 all 浏览模式，作品库总数是否等于全库 20928（与首页口径一致）。
 *
 * 背景：首页显示全库 getTotalWorkCount()=20928，作品库走 workWhere 过滤。
 * 游客未登录被强制 sfw，会少掉露骨作品（此前实测 17936，差 2992）。
 * 本脚本验证「登录 + all」下两者应对齐。
 *
 * 跑法：$env:TEST_USER="demo_user"; $env:TEST_PASS="demo123456"; node scripts/verify-allmode.mjs
 */
import { chromium } from "playwright"

const BASE = "http://localhost:3000"
const USER = process.env.TEST_USER || "demo_user"
const PASS = process.env.TEST_PASS || "demo123456"

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

// ── 登录（用 Enter 提交：页面有登录/注册 tab，按文案找按钮会误点 tab）──
await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 120000 })
await page.waitForTimeout(3500)
const info = await page.$$eval("input", (els) =>
  els.map((e) => ({ type: e.type, ph: e.placeholder })),
)
const pwdIdx = info.findIndex((i) => i.type === "password" || /密码|password/i.test(i.ph || ""))
const userIdx = info.findIndex((i, idx) => idx !== pwdIdx && i.type !== "hidden")
await page.locator("input").nth(userIdx).fill(USER)
await page.locator("input").nth(pwdIdx).fill(PASS)
await page.locator("input").nth(pwdIdx).press("Enter")
await page.waitForTimeout(9000)
console.log("登录成功 =", !page.url().includes("/login"))

/** 读取作品库「共 N 部作品」 */
async function readTotal() {
  await page.goto(BASE + "/galvelica/works", { waitUntil: "domcontentloaded", timeout: 120000 })
  await page
    .waitForFunction(() => /共\s*\d+\s*部作品/.test(document.body.innerText), { timeout: 120000 })
    .catch(() => {})
  const t = await page.innerText("body")
  const m = t.match(/共\s*([\d,]+)\s*部作品/)
  return m ? Number(m[1].replace(/,/g, "")) : null
}

// ① 登录后默认模式（sfw）
const sfwTotal = await readTotal()
console.log("登录后默认（sfw）总数 =", sfwTotal)

// ② 切到 all 模式
await ctx.addCookies([{ name: "gal_nsfw", value: "all", domain: "localhost", path: "/" }])
const allTotal = await readTotal()
console.log("all 模式总数 =", allTotal)

console.log("差值（露骨作品数）=", allTotal != null && sfwTotal != null ? allTotal - sfwTotal : "N/A")
console.log("首页口径（全库）= 20928，all 模式是否与之对齐 =", allTotal === 20928)

await browser.close()
