import { chromium } from "playwright"

const BASE = "http://localhost:3000"
const ADMIN = { user: "admin", pw: "Admin12345!" }

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

const log = (...a) => console.log(...a)

/** 点击文案匹配的按钮 */
async function clickText(t) {
  const el = page.locator(`button:has-text("${t}")`).first()
  if (await el.count()) {
    await el.click()
    await page.waitForTimeout(2500)
    return true
  }
  return false
}

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 120000 })
await page.waitForTimeout(3500)

// 步骤 1：站点信息（已有默认值）→ 下一步
log("步骤1 站点信息 -> 下一步:", await clickText("下一步"))

// 步骤 2：个性化（用默认）→ 下一步
log("步骤2 个性化 -> 下一步:", await clickText("下一步"))

// 步骤 3：站长账号
const step3 = await page
  .locator('input[placeholder="admin"]')
  .count()
  .catch(() => 0)
log("是否到达站长账号步骤（找到用户名框）:", step3 > 0)

if (step3 > 0) {
  await page.fill('input[placeholder="admin"]', ADMIN.user)
  await page.fill('input[placeholder="至少 8 个字符"]', ADMIN.pw)
  await page.fill('input[placeholder="再次输入密码"]', ADMIN.pw)
  log("已填写站长账号")
  log("步骤3 -> 下一步:", await clickText("下一步"))
}

// 步骤 4：精确点「确认并初始化」（此前按“非上一步/下一步”筛选会误点到装饰按钮）
log("已点击确认并初始化:", await clickText("确认并初始化"))
await page.waitForTimeout(10000)

log("初始化后 URL =", page.url())
const body = await page.innerText("body")
log("页面是否仍显示初始化向导:", /欢迎使用 Circleica|站点信息/.test(body))
log("是否已进入站点（出现用户/设置入口）:", /退出|登出|我的|个人|设置/.test(body))

await browser.close()
