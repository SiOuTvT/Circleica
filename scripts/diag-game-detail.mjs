/** 诊断：从 /games 列表进入真实游戏详情页，输出页面按钮与关键文本 */
import { chromium } from "playwright"

const BASE = "http://localhost:3000"
const USER = process.env.TEST_USER || "demo_user"
const PASS = process.env.TEST_PASS || "demo123456"

const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()

// 登录
await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 120000 })
await page.waitForTimeout(3500)
const inputs = await page.$$eval("input", (els) => els.map((e) => ({ type: e.type, ph: e.placeholder })))
const pwdIdx = inputs.findIndex((i) => i.type === "password" || /密码|password/i.test(i.ph || ""))
const userIdx = inputs.findIndex((i, idx) => idx !== pwdIdx && i.type !== "hidden")
await page.locator("input").nth(userIdx).fill(USER)
await page.locator("input").nth(pwdIdx).fill(PASS)
await page.locator("input").nth(pwdIdx).press("Enter")
await page.waitForTimeout(9000)
console.log("登录成功 =", !page.url().includes("/login"))

// 列表页 → 第一个游戏链接
await page.goto(BASE + "/games", { waitUntil: "domcontentloaded", timeout: 120000 })
await page.waitForTimeout(5000)
const href = await page
  .locator('a[href*="/games/"]')
  .first()
  .getAttribute("href")
  .catch(() => null)
console.log("列表第一个游戏链接 =", href)

if (href) {
  await page.goto(BASE + href, { waitUntil: "domcontentloaded", timeout: 120000 })
  await page.waitForTimeout(5000)

  console.log("详情页 URL =", page.url())
  console.log("详情页标题 =", await page.title())

  const btns = await page.$$eval("button", (els) =>
    els.map((e) => (e.innerText || "").trim()).filter(Boolean).slice(0, 30),
  )
  console.log("按钮列表 =", JSON.stringify(btns))

  const text = (await page.innerText("body")).replace(/\s+/g, " ")
  console.log("页面文本前 500 字 =", text.slice(0, 500))
}

await browser.close()
