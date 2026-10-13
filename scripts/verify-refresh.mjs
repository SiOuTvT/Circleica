import { chromium } from "playwright"

const BASE = "http://localhost:3000"

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

// ── ① 用项目 seed 自带的演示账号登录 ──────────────────────────────
await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 120000 })
await page.waitForTimeout(3500)

const info = await page.$$eval("input", (els) =>
  els.map((e) => ({ type: e.type, name: e.name, ph: e.placeholder })),
)
console.log("inputs =", JSON.stringify(info))

// 密码框：type=password，或 placeholder 含「密码」
const pwdIdx = info.findIndex((i) => i.type === "password" || /密码|password/i.test(i.ph || ""))
// 账号框：除密码框外第一个非隐藏输入
const userIdx = info.findIndex((i, idx) => idx !== pwdIdx && i.type !== "hidden")
console.log("账号框 index =", userIdx, " 密码框 index =", pwdIdx)

if (userIdx >= 0) await page.locator("input").nth(userIdx).fill("demo_user")
if (pwdIdx >= 0) await page.locator("input").nth(pwdIdx).fill("demo123456")

const btn = page.locator("button").filter({ hasText: /登录|登入|Sign in/ }).first()
if (await btn.count()) {
  await btn.click()
} else {
  await page.locator('button[type="submit"]').first().click()
}
await page.waitForTimeout(6000)

console.log("登录后 URL =", page.url())
const body = await page.innerText("body")
const loggedIn = /退出|登出|我的|个人|设置/.test(body)
console.log("是否登录成功 =", loggedIn)

if (!loggedIn) {
  console.log("页面文本前 300 字：")
  console.log(body.slice(0, 300))
}

await browser.close()
