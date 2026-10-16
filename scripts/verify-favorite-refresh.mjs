/**
 * 实测 router.refresh：点击「收藏」，看服务端渲染的收藏计数是否自动同步。
 *
 * 验证点：详情页「浏览 N 下载 N 收藏 N」由服务端渲染。点击收藏按钮后，
 *         若 router.refresh 生效，计数会自动 +1（无需手动刷新页面）。
 *
 * 账号密码走环境变量，不落盘。
 */
import { chromium } from "playwright"

const BASE = "http://localhost:3000"
const USER = process.env.TEST_USER || "demo_user"
const PASS = process.env.TEST_PASS || "demo123456"
const DETAIL = process.env.GAME_URL || "/games/41"

const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()

// ── 登录 ────────────────────────────────────────────────────────
await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 120000 })
await page.waitForTimeout(3500)
const inputs = await page.$$eval("input", (els) =>
  els.map((e) => ({ type: e.type, ph: e.placeholder })),
)
const pwdIdx = inputs.findIndex((i) => i.type === "password" || /密码|password/i.test(i.ph || ""))
const userIdx = inputs.findIndex((i, idx) => idx !== pwdIdx && i.type !== "hidden")
await page.locator("input").nth(userIdx).fill(USER)
await page.locator("input").nth(pwdIdx).fill(PASS)
await page.locator("input").nth(pwdIdx).press("Enter")
await page.waitForTimeout(9000)
console.log("登录成功 =", !page.url().includes("/login"))

// ── 打开详情页，读取服务端渲染的收藏计数 ───────────────────────
await page.goto(BASE + DETAIL, { waitUntil: "domcontentloaded", timeout: 120000 })
await page.waitForTimeout(5000)

const favCount = () =>
  page.evaluate(() => {
    const t = document.body.innerText.replace(/\s+/g, " ")
    const m = t.match(/收藏\s*(\d+)/)
    return m ? Number(m[1]) : null
  })

const before = await favCount()
console.log("收藏计数（操作前）=", before)

let rscCalls = 0
page.on("request", (r) => {
  const u = r.url()
  if (u.includes(DETAIL) && (r.headers()["rsc"] || u.includes("_rsc"))) rscCalls++
})

// ── 点击收藏 ────────────────────────────────────────────────────
const favBtn = page.locator('button:has-text("收藏")').first()
try {
  await favBtn.click({ timeout: 8000 })
  console.log("已点击收藏按钮")
} catch (e) {
  console.log("点击收藏失败:", e.message)
}
await page.waitForTimeout(7000)

const after = await favCount()
console.log("收藏计数（操作后）=", after)
console.log("RSC 刷新请求数 =", rscCalls)

if (before !== null && after !== null && before !== after) {
  console.log("结论：服务端计数自动变化 ✓ → router.refresh() 生效")
} else if (rscCalls > 0) {
  console.log("结论：检测到 RSC 刷新请求 ✓ → router.refresh() 已触发")
} else {
  console.log("结论：未检测到刷新（可能未登录成功/未点中按钮/组件走本地 state）")
}

await browser.close()
