/**
 * 实测 router.refresh：在游戏详情页评分，验证服务端数据是否自动同步。
 *
 * 判据（两者任一即可证明 refresh 生效）：
 *   1) 出现对同路由的 RSC 刷新请求（router.refresh 的直接特征）
 *   2) 页面上服务端渲染的评分统计文本发生变化
 *
 * 账号密码走环境变量，不落盘。
 */
import { chromium } from "playwright"

const BASE = "http://localhost:3000"
const USER = process.env.TEST_USER || "demo_user"
const PASS = process.env.TEST_PASS || "demo123456"

const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()

// ── 登录（Enter 提交，避免误点登录/注册 tab）──────────────────────
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

// ── 打开游戏详情 ────────────────────────────────────────────────
await page.goto(BASE + "/games/1", { waitUntil: "domcontentloaded", timeout: 120000 })
await page.waitForTimeout(5000)

const ratingText = () =>
  page.evaluate(() => {
    const t = document.body.innerText.replace(/\s+/g, " ")
    const m = t.match(/评分[^。]{0,50}/) || t.match(/[\d.]+\s*分[^。]{0,40}/) || t.match(/\d+\s*人[^。]{0,30}/)
    return m ? m[0] : "(无评分相关文本)"
  })

const before = await ratingText()
console.log("评分相关文本（操作前）:", before)

// 监听 RSC 刷新请求
let rscCalls = 0
page.on("request", (r) => {
  const u = r.url()
  if (u.includes("/games/1") && (r.headers()["rsc"] || u.includes("_rsc"))) rscCalls++
})

// 尝试点击评分控件（星星/评分按钮）
const selectors = [
  'button[aria-label*="星"]',
  'button[title*="星"]',
  '[class*="rating"] button',
  'svg[class*="star"]',
]
let clicked = null
for (const s of selectors) {
  const el = page.locator(s).first()
  if (await el.count().catch(() => 0)) {
    try {
      await el.click({ timeout: 5000 })
      clicked = s
      break
    } catch {
      /* 换下一个选择器 */
    }
  }
}
console.log("点击到的评分控件 =", clicked ?? "(未找到)")

await page.waitForTimeout(6000)
const after = await ratingText()
console.log("RSC 刷新请求数 =", rscCalls, rscCalls > 0 ? "→ router.refresh 已触发 ✓" : "")
console.log("评分相关文本（操作后）:", after)
console.log("服务端文本是否变化 =", before !== after ? "是 ✓（数据自动同步）" : "否（可能未操作成功或控件走本地 state）")

await browser.close()
