/**
 * 验证项目自带翻译接口 /api/translate 是否可用（限速：每次请求间隔 ≥6.5s，
 * 遵守接口自带限流 10 次/分钟）。只取少量样本验证效果。
 */
import { chromium } from "playwright"

const BASE = "http://localhost:3000"
const USER = process.env.TEST_USER
const PASS = process.env.TEST_PASS

if (!USER || !PASS) {
  console.error("请设置 TEST_USER / TEST_PASS")
  process.exit(1)
}

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

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
const logged = !page.url().includes("/login")
console.log("登录成功 =", logged, " URL =", page.url())

if (logged) {
  // 取含日文标题的作品，小批量试翻
  const samples = await prisma.work.findMany({
    select: { title: true, englishName: true },
    take: 400,
  })
  const jp = samples.filter((w) => /[぀-ヿ]/.test(String(w.title ?? ""))).slice(0, 12)
  console.log(`\n=== 试翻 ${jp.length} 条日文标题 ===`)
  for (const w of jp) {
    try {
      const r = await page.evaluate(async (text) => {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        })
        return await res.json()
      }, String(w.title).slice(0, 500))
      const t = r?.data?.data?.translated
      console.log(`  ${String(w.title).slice(0, 34)}  →  ${t ?? "(失败)"}`)
    } catch (e) {
      console.log(`  ${String(w.title).slice(0, 34)}  →  异常: ${e.message}`)
    }
    await page.waitForTimeout(6600) // 限速：10 次/分钟
  }
}

await browser.close()
