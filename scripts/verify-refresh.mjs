/**
 * 登录态实测：验证登录后页面可用，并为 router.refresh 刷新验证做准备。
 *
 * 账号密码通过环境变量传入，绝不写入文件 / 提交到 git：
 *   $env:TEST_USER="xxx"; $env:TEST_PASS="xxx"; node scripts/verify-refresh.mjs
 *
 * 依赖：数据库可用 + dev server 在 3000 端口。
 */
import { chromium } from "playwright"

const BASE = "http://localhost:3000"
const USER = process.env.TEST_USER
const PASS = process.env.TEST_PASS

if (!USER || !PASS) {
  console.error("请设置环境变量 TEST_USER 与 TEST_PASS")
  process.exit(1)
}

const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 120000 })
await page.waitForTimeout(3500)

const info = await page.$$eval("input", (els) =>
  els.map((e) => ({ type: e.type, ph: e.placeholder })),
)
const pwdIdx = info.findIndex((i) => i.type === "password" || /密码|password/i.test(i.ph || ""))
const userIdx = info.findIndex((i, idx) => idx !== pwdIdx && i.type !== "hidden")

if (userIdx < 0 || pwdIdx < 0) {
  console.log("未找到登录表单（可能仍处于初始化向导），inputs =", JSON.stringify(info))
  await browser.close()
  process.exit(1)
}

await page.locator("input").nth(userIdx).fill(USER)
await page.locator("input").nth(pwdIdx).fill(PASS)

// 用 Enter 提交：页面有「登录/注册」两个 tab，按文案找按钮会误点 tab 而非提交
await page.locator("input").nth(pwdIdx).press("Enter")
await page.waitForTimeout(10000)

console.log("登录后 URL =", page.url())
const body = await page.innerText("body")
console.log("登录成功 =", /退出|登出|我的|个人|设置/.test(body))
// 诊断输出：看页面上到底显示了什么（是否有错误提示）
console.log("--- 页面文本片段 ---")
console.log(body.replace(/\s+/g, " ").slice(0, 400))

await browser.close()
