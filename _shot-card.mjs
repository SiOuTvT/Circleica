import { chromium } from "playwright"
import fs from "node:fs"

const base = "http://localhost:3001"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
try {
  console.log("goto /user/1 ...")
  await page.goto(`${base}/user/1`, { waitUntil: "networkidle", timeout: 60000 })
  await page.waitForTimeout(2000)

  // 检查「生成名片」按钮是否存在
  const btn = page.getByText("生成名片")
  const btnCount = await btn.count()
  console.log("生成名片 button count:", btnCount)

  if (btnCount > 0) {
    // 点开弹窗
    await btn.first().click()
    await page.waitForTimeout(1000)
    const modal = page.locator("text=选择代表收藏")
    const modalCount = await modal.count()
    console.log("picker modal visible:", modalCount > 0)
    await page.screenshot({ path: "_shot-picker.png", fullPage: false })
    console.log("screenshot saved: _shot-picker.png")
  }

  await page.screenshot({ path: "_shot-profile.png", fullPage: false })
  console.log("screenshot saved: _shot-profile.png")
} catch (e) {
  console.log("ERR", e.message)
} finally {
  await browser.close()
}
